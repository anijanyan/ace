let src = "../../src/";
if (typeof process == "undefined") {//TODO dirty hack
    src = "ace/";
}

const CustomTokenizer = require(src + "tokenizer").CustomTokenizer;
const Tokenizer = CustomTokenizer;
const MarkdownHighlightRules = require(src + "mode/markdown_highlight_rules").MarkdownHighlightRules;
const dom = require(src + "lib/dom");

function parseMarkdown(string) {
    let parsedTokens = [];
    let parsedToken = null;//{tagName: "", value: "", children: [], parentToken: {}};

    var currToken, nextToken, prevToken;

    var blockquoteCount = 0;

    //TODO: check is markdown

    const tokenizer = new Tokenizer(new MarkdownHighlightRules().getRules(), "markdown");
    let lines = string.split("\n").map((line) =>
        line.replace(`\r`, "")
            .replace(/^([ >]*)\t+/gm, (match, p1) => match.replace(/^ +/, "").replaceAll("\t", " ".repeat(4)))
    );

    function getGithubRegexp(toTheEnd) {
        var regexpLine = "^ *"
            + parsedToken.startingChar
            + "{" + parsedToken.startFence.length + ",}";
        if (toTheEnd)
            regexpLine += "$";
        return new RegExp(regexpLine);
    }

    function handleStringEmphasis(tokenName, value) {
        if (parsedToken.tagName !== "em" && parsedToken.tagName !== "strong") {
            console.log("shouldn't get here");//TODO handle this error
            return;
        }
        var delimiter = parsedToken.del;
        if (tokenName === "string.strong")
            delimiter += delimiter;

        var length = delimiter.length;
        var shouldClose = false;

        var regexp = new RegExp("^\\" + parsedToken.del + "+$")
        if (regexp.test(value)) {
            var children = parsedToken.children;
            if (children.length > 0)
                children.unshift(delimiter);
            removeToken();
            parsedToken.children.push(...children, value);
            return;
        }

        if (value.startsWith(delimiter)) {
            if (parsedToken.children.length > 0) {
                console.log("Something went wrong");
                return;
            }
            value = value.substring(length);
        }
        if (value.endsWith(delimiter)) {
            value = value.substring(0, value.length - length);
            shouldClose = true;
        }
        parsedToken.children.push(value);
        shouldClose && closeToken();
    }

    function handleLinkTitle(value, isEscaped) {
        if (isNewLine && parsedToken.title !== undefined)
            parsedToken.title += "\n";
        isNewLine = false;
        parsedToken.quot ||= value.substring(0, 1);
        parsedToken.title ||= "";
        if (!isEscaped) {
            value = value.replaceAll(parsedToken.quot, "");
            if (parsedToken.quot === "(")//TODO
                value = value.replaceAll(")", "");
        }

        value = value.replaceAll('"', "&quot;");
        parsedToken.title += value;
    }

    function getListParams(value) {
        value = value.trim();
        var params = {isUsingP: false};
        params.isOrdered = !("*+-".includes(value));
        if (!params.isOrdered) {
            params.del = value;
        } else {
            params.del = value.slice(-1);
            params.start = value.slice(0, -1);
        }
        return params;
    }

    function handleList(value) {
        var params = getListParams(value);

        if (parsedToken) {
            if (parsedToken.tagName === "p" ||
                (parsedToken.tagName === "list"
                    && (parsedToken.isOrdered !== params.isOrdered ||
                        parsedToken.del !== params.del)))
                closeToken();
        }

        if (parsedToken && parsedToken.tagName === "list") {
            if (parsedToken.isOrdered !== params.isOrdered ||
                parsedToken.del !== params.del
            )
                closeToken();
        }

        if (parsedToken?.tagName !== "list")
            openToken("list", params);
    }

    function getBlockquoteMatch(value) {
        var match = value.match(/^ *([> ]+)/);
        if (!match)
            return "";
        return match[0];
    }

    function getBlockquoteCount(value) {
        return getBlockquoteMatch(value).replaceAll(" ", "").length;
    }

    function removeBlockquote(value) {
        return value.replace(getBlockquoteMatch(value), "");
    }

    function isLink(token) {
        return token && (token.tagName === "a" || token.tagName === "img")
    }

    function getParent(token, tagName) {
        while (token) {
            if (token.tagName === tagName)
                return token;
            token = token.parentToken;
        }
        return null;
    }

    function hasParent(token, tagName) {
        return getParent(token, tagName) != null;
    }

    function buildTokenTree(type, value, childTag) {
        function tryBuildParent() {
            if (!type.parent)
                return;

            if (parsedToken) {
                if (tagName === "li" && parsedToken.tagName === "list" && parsedToken.indent === type.indent) {
                    return;
                } else if (isLink(parsedToken)) {
                    return;
                }
            }
            buildTokenTree(type.parent, value, tagName);
        }

        if (isLink(parsedToken)) {
            if (type.name.startsWith("linkDestination")) {
                if (type.name === "linkDestination")
                    parsedToken.isReference = true;
                return;
            } else if (value === "]" || value === "],") {
                parsedToken.hasReference = true;
                return;
            } else if (type.name === "paragraph" || type.name === "header") {
                return;
            }
        }

        let tagName = getTokenHtmlTag(type.name);

        if (tagName) {
            switch (tagName) {
                case "li":
                    if (value.trim() === "") {
                        return;
                    } else if (parsedToken) {
                        if (parsedToken.tagName === "p" && parsedToken.parentToken && parsedToken.parentToken.tagName === "li")
                            return;
                        if ((parsedToken.tagName === tagName) && (!type.indent || type.indent === parsedToken.indent))
                            return;
                        if (parsedToken.isRawHtml && currToken.type.name.endsWith(".xml"))
                            return;
                    }
                    break;
                case "p":
                    if (parsedToken && parsedToken.tagName === tagName)
                        return;
                    if (childTag === "header")
                        return;
                    break;
                case "blockquote":
                    var count = getBlockquoteCount(value);
                    var i = 1;
                    if (parsedToken) {
                        var blockquoteToken;
                        if (parsedToken.tagName === tagName) {
                            blockquoteToken = parsedToken;
                        } else if (parsedToken.isRawHtml) {
                            var parent = parsedToken;
                            while (parent) {
                                if (parent.tagName === tagName) {
                                    blockquoteToken = parent;
                                    break;
                                }
                                parent = parent.parentToken;
                            }
                        } else if (parsedToken.tagName === "p") {
                            if (!parsedToken.parentToken) {
                                closeToken();
                            } else if (parsedToken.parentToken.tagName === tagName) {
                                blockquoteToken = parsedToken.parentToken;
                            }
                        }
                        if (blockquoteToken) {
                            if (blockquoteToken.level >= count) {
                                return;
                            } else {
                                i = blockquoteToken.level;
                            }
                        }

                        if (parsedToken && parsedToken.tagName === "li") {//TODO!!!!
                            i = blockquoteCount + 1;
                        }
                    }
                    blockquoteCount = count;
                    for (; i <= count; i++) {
                        openToken(tagName, {level: i});
                    }
                    return;
                case "rawHtml"://TODO
                    if (currToken.type.name.endsWith("tag-name.xml")) {
                        if (!prevToken.type.name.endsWith("tag-open.xml"))
                            return;
                        tagName = currToken.value;
                        if (prevToken.type.name.endsWith("end-tag-open.xml")) {
                            if (hasParent(parsedToken, tagName)) {
                                var done = false;
                                while (parsedToken && !done) {
                                    done = parsedToken.tagName === tagName;
                                    closeToken();
                                }
                            } else {
                                openToken("htmlBlock", {isRawHtml: true});
                                parsedToken.children.push("</", tagName, ">");
                            }

                            return;
                        }
                    } else {
                        return;
                    }

                    openToken(tagName, {isRawHtml: true});
                    return;
                default:
                    if (parsedToken && parsedToken.tagName === tagName)
                        return;
                    break;
            }
        }

        tryBuildParent();

        if (!tagName)
            return;

        var params = {};
        switch (tagName) {
            case "htmlBlock":
                params["isRawHtml"] = true;
                break;
            case "code":
                if (type.name !== "codeSpan") {
                    openToken("pre");
                } else {
                    if (!parsedToken)
                        openToken("p");
                }
                params.name = type.name;
                switch (type.name) {
                    case "githubblock":
                        params.isFirstLine = true;
                        params.startingChar = value.trimStart()[0];
                        var regexp = new RegExp("^" + params.startingChar + "+");
                        params.indent = value.match(/^\s*/)[0].length;
                        if (parsedToken.parentToken && parsedToken.parentToken.tagName === "li")
                            params.indent += prevToken.value.length;
                        params.startFence = regexp.exec(value.trimStart())[0];
                        break;
                    case "codeBlockInline":
                        params.temporaryChildren = [];
                        break;
                }
                break;
            case "em":
            case "strong":
                params.del = type.name.startsWith("bar") ? "_" : "*";
                break;
            case "li":
                handleList(value);
                params.isUsingP = parsedToken.isUsingP;
                break;
        }

        openToken(tagName, params);
    }

    function getTokenHtmlTag(typeName) {
        switch (typeName) {
            case 'paragraph':
                return "p";
            case 'linkLabel':
                return "a";
            case 'imageLabel':
                return "img";
            case 'listBlockInline':
            case 'listBlock':
                return "li";
            case 'header':
                return "header";
            case 'codeSpan':
            case 'githubblock':
            case 'codeBlockInline':
                return "code";
            case 'emphasisState':
            case 'barEmphasisState':
                return "em";
            case 'barStrongState':
            case 'strongState':
                return "strong";
            case 'blockquoteInline':
            case 'blockquote':
                return "blockquote";
            case "tag_stuff":
            case "comment":
                return "rawHtml";
            case "html":
                return "htmlBlock"
            default:
                return null;
        }
    }

    function updateToken(tagName) {
        parsedToken.tagName = tagName;
    }

    function createToken(tagName, parentToken, createdToken) {
        createdToken ||= {};
        createdToken.tagName = tagName;
        createdToken.children = [];
        createdToken.parentToken = parentToken;

        return createdToken;
    }

    function openToken(tagName, params) {
        parsedToken = createToken(tagName, parsedToken, params);
    }

    function closeToken(count) {
        count ??= 1;
        if (!parsedToken)
            return;

        var parentToken = parsedToken.parentToken;

        if (parsedToken.isReference) {
            parsedTokens.push(parsedToken);
            parsedToken = null;
            if (parentToken.tagName === "p")
                return;
        }

        if (parsedToken) {
            switch (parsedToken.tagName) {
                case "header":
                case "p":
                    if (parsedToken.tagName === "p" && !parsedToken.children.length) {
                        parsedToken = null;
                        break;
                    }

                    var lastIndex = parsedToken.children.length - 1;
                    var lastChild = parsedToken.children[lastIndex];
                    if (lastChild && (lastChild === "\n" || lastChild.tagName === "br")) {
                        parsedToken.children.pop();
                    } else if (typeof lastChild === "string") {
                        parsedToken.children[lastIndex] = lastChild.trimEnd();
                    }
                    break;
                case "li":
                    if (parsedToken.isUsingP && !parentToken.isUsingP) {
                        useParagraphForList(parentToken);
                    }
                    break;
            }
        }

        if (parentToken) {
            parsedToken && parentToken.children.push(parsedToken);
            parsedToken = parentToken;
            if (count > 1)
                return closeToken(count - 1);
        } else if (parsedToken) {
            parsedTokens.push(parsedToken);
            parsedToken = null;
        }
    }

    function useParagraphForList(token) {
        token.isUsingP = true;
        token.children.forEach((childToken) => {
            startUsingParagraphForLi(childToken);
        })
    }

    function startUsingParagraphForLi(token) {
        if (token.isUsingP)
            return;

        token.isUsingP = true;

        var paragraph;
        var start;
        var paragraphList = [];

        token.children.forEach(function (child, i) {
            if (typeof child === "string") {
                if (!paragraph) {
                    paragraph = createToken("p", token);
                    start = i;
                }
                paragraph.children.push(child);
            } else if (paragraph) {
                paragraphList.push({
                    "paragraph": paragraph,
                    "start": start,
                    "count": i - start
                })
                paragraph = null;
            }
        });
        paragraph && paragraphList.push({
            "paragraph": paragraph,
            "start": start,
            "count": token.children.length - start
        });

        paragraphList.forEach((paragraphData) => {
            token.children.splice(paragraphData.start, paragraphData.count, paragraphData.paragraph)
        })
    }

    function removeToken() {
        parsedToken = parsedToken.parentToken;
    }

    var startState, lastToken, data, tokens, firstToken, firstTokenType, tokensLength;

    var isPreviousEmpty = false;
    var shouldIgnoreLine, isNewLine;
    lines.forEach(function(line, i) {
        shouldIgnoreLine = false;
        isNewLine = true;

        function parseToken(name, value, isStartLine) {
            function addChildValue() {
                if (!value.length)
                    return;
                if (!parsedToken) {
                    console.log("Should not get here");
                    return;
                }
                if (isLink(parsedToken) && !name.startsWith("constant"))
                    return;
                parsedToken.children.push(value);
            }

            if (name.startsWith("markup.heading.")) {
                if (/^#+$/.test(value) && parsedToken.tagName === "p") //TODO hacked
                    updateToken("header");
                if (!parsedToken) {
                    openToken("p");
                    addChildValue();
                } else {
                    parsedToken.heading = name.split(".")[2];
                }

                return;
            }
            if (name.startsWith("markup.list") && parsedToken.tagName === "li") {
                var indent = Number(name.split(".")[2]) || value.length;//TODO
                parsedToken.indent = indent;
                parsedToken.parentToken.indent = indent;
                return;
            }
            if (name.endsWith(".xml")) {
                var nameData = name.split(".");
                var tagName = nameData[nameData.length - 2];
                switch (tagName) {
                    case "attribute-name":
                        parsedToken["attributes"] ||= {};
                        parsedToken.attributeName = value;
                        return;
                    case "attribute-value":
                        parsedToken["attributes"][parsedToken.attributeName] ||= "";
                        parsedToken["attributes"][parsedToken.attributeName] += value.replaceAll('"', "");//TODO
                        if (value.endsWith('"'))
                            parsedToken.attributeName = null;
                        return;
                    case "tag-close":
                        parsedToken.doneAttributes = true;
                        return;
                }
                return;
            } else if (parsedToken && parsedToken.tagName === "htmlBlock") {
                return addChildValue();
            }
            switch (name) {
                case "constant.thematic_break":
                    closeToken(Infinity);
                    openToken("hr");
                    return closeToken();
                case "text":
                case "heading":
                case "constant":
                    if (parsedToken && parsedToken.isRawHtml) {
                        parsedToken.children.push(value);
                        return;
                    }
                    if (name === "heading") {
                        if ((!nextToken || nextToken.type.name !== "constant.language.escape")
                            && !(/^#+$/.test(value) && parsedToken.children[parsedToken.children.length - 1] === "#"))
                            value = value.replace(/ +#+ *$/, "");
                    } else if (name === "text" && (nextToken?.type.name === "url" || prevToken?.type.name === "url")) {
                        return;
                    } else if (!currToken.type.parent.name.startsWith("linkDestination") && isLink(parsedToken) && value === "]") {
                        closeToken();
                        value = value.replace("]", "");
                    }
                    if (!parsedToken || !parsedToken.children.length || isStartLine)
                        value = value.trimStart();

                    return addChildValue();
                case "support.function":
                    if (!parsedToken) {
                        console.log("Error: empty parsedToken");
                        return;
                    }
                    var parent = parsedToken.parentToken;
                    var indent = 4;
                    while (parent) {
                        if (parent.tagName === "blockquote") {
                            value = value.replace(/^ /, "");
                            break;
                        } else if (parent.tagName === "li") {
                            indent += parent.indent;
                        }
                        parent = parent.parentToken;
                    }
                    if (!parent) {
                        switch (parsedToken.name) {
                            case "githubblock":
                                if (parsedToken.isFirstLine) {
                                    value = value.replace(getGithubRegexp(), "").trimStart();
                                    parsedToken.info = value.split(" ")[0];
                                    return;
                                } else if (parsedToken.indent) {
                                    var regexp = "^ {1," + parsedToken.indent + "}"
                                    value = value.replace(new RegExp(regexp), "");
                                }
                                break;
                            case "codeSpan":
                                value = value.replace(/^`+/, "").replace(/^ (.+) $/, '$1');
                                break;
                            default:
                                value = line.substring(indent);
                                break;
                        }
                    }
                    if (parsedToken.name === "codeBlockInline" && !value.trim().length) {
                        parsedToken.temporaryChildren.push(value);
                        return;
                    }
                    if (!value.length)
                        return;
                    return addChildValue();
                case "list":
                    if (parsedToken.isUsingP && parsedToken.tagName !== "p")
                        openToken("p");
                    if (parsedToken.tagName === "li")
                        handleParagraph();
                    return addChildValue();
                case "string.emphasis":
                case "string.strong":
                    return handleStringEmphasis(name, value);
                case "constant.language.escape":
                    value = value.replace(/\\(.)/g, '$1');
                    if (isLink(parsedToken) && currToken.type.parent.name.startsWith("string"))
                        return handleLinkTitle(value, true);
                    return addChildValue();
                case "markup.underline":
                    parsedToken.href = value;
                    return;
                case "string":
                    return handleLinkTitle(value);
                case "string.blockquote":
                    value = removeBlockquote(value);
                    if (!value.length) {
                        if (parsedToken.tagName === "p")
                            closeToken();
                        return;
                    }
                    if (!parsedToken) {
                        console.log("should not get here");
                        return;
                    }
                    if (!parsedToken.isRawHtml && parsedToken.tagName !== "p")
                        openToken("p");
                    addChildValue();
                    return;
                case "url":
                    openToken("p");
                    openToken("a");
                    parsedToken.children.push(value);
                    parsedToken.href = "";
                    if (/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(value))//TODO
                        parsedToken.href = "mailto:";
                    parsedToken.href += value;
                    closeToken(2);
                    return;
            }
        }

        function handleParagraph() {
            var checkLine = line;
            if (blockquoteCount > 0)
                checkLine = removeBlockquote(checkLine);
            if (checkLine.trim() === "")
                return;

            if (firstTokenType === "constant.thematic_break")
                return;

            var lastIndex = parsedToken.children.length - 1;
            var lastChild = parsedToken.children[lastIndex];
            if (firstTokenType.startsWith("markup.heading.")) {
                if (["=", "-"].includes(firstToken.value.trim()[0])) {
                    updateToken("header");
                } else {
                    closeToken();
                }
            } else {
                if (!lastChild || (typeof lastChild !== "string"))
                    return;

                if (lastChild.endsWith("\\") || lastChild.endsWith("  ")) {
                    lastChild = lastChild.slice(0, -1);
                    parsedToken.children.push({tagName: "br"});
                }
                parsedToken.children[lastIndex] = lastChild.trimEnd();
                parsedToken.children.push("\n");
            }
        }

        function useParagraphForLi() {
            startUsingParagraphForLi(parsedToken);
            if (isPreviousEmpty) {
                isPreviousEmpty = false;
            } else if (parsedToken.children[parsedToken.children.length - 1].tagName === "p") {
                parsedToken = parsedToken.children.pop();
                handleParagraph();
            }
        }

        function tryCloseList() {
            if (!parsedToken || parsedToken.tagName !== "li")
                return;
            var parentToken = firstToken.type.parent;
            while (parentToken) {
                if (parentToken.name.startsWith("list"))
                    return;
                parentToken = parentToken.parent;
            }
            closeToken(2);
        }

        function tryCloseBlockquote() {
            if (!parsedToken || blockquoteCount === 0)
                return;
            if (["p", "em", "strong"].includes(parsedToken.tagName) && firstTokenType.startsWith("string"))
                return;
            var count = getBlockquoteCount(line);
            if (count >= blockquoteCount)
                return;

            while (parsedToken && blockquoteCount > count) {
                if (parsedToken.tagName === "blockquote")
                    blockquoteCount--;
                closeToken();
            }
        }

        function initLine() {
            data = tokenizer.getLineTokens(line, startState);
            tokens = data.tokens;

            firstToken = tokens[0];
            firstTokenType = firstToken.type.name;

            tokensLength = tokens.length;
            lastToken = tokens[tokensLength - 1];
            startState = (lastToken !== undefined
                && lastToken.type !== undefined
                && lastToken.type.parent !== undefined)
                ? lastToken.type.parent : data.state;
        }

        function handleNewLine() {
            if (!parsedToken)
                return;

            if (parsedToken.isRawHtml) {
                if (hasParent(parsedToken, "li"))
                    return handleNewLineForLi();
                if (isHtml(tokens[0]) || blockquoteCount > 0) {
                    if (parsedToken.doneAttributes) {
                        parsedToken.children.push("\n");
                    } else if (parsedToken.attributeName) {
                        parsedToken.attributes[parsedToken.attributeName] += "\n";
                    }
                }

                return;
            }

            function handleNewLineForLi() {
                var markupType = firstTokenType;
                if (markupType === "indent" || firstTokenType === "string.blockquote") {
                    if (tokens[1]) {
                        markupType = tokens[1].type.name;
                    }
                    else {
                        isPreviousEmpty = true;
                        return;
                    }
                }

                if (firstTokenType === "empty") {
                    isPreviousEmpty = true;
                    shouldIgnoreLine = true;
                } else {
                    if (markupType.startsWith("markup.list") || (markupType === "list" && firstTokenType
                        === "indent" && isPreviousEmpty)) {
                        var newIndent = markupType.startsWith("markup.list") ? Number(markupType.split(".")[2])
                            : firstToken.value.length;
                        while (parsedToken && (["li", "list"].includes(parsedToken.tagName) || parsedToken.isRawHtml)) {
                            var listToken = parsedToken.isRawHtml ? getParent(parsedToken, "li") : parsedToken;
                            var diff = newIndent - listToken.indent;

                            if (diff >= 2)//should create sublist
                                break;

                            if (listToken.tagName === "list" && (diff === 0 || !listToken.parentToken))
                                //should create list item in current list
                                break;


                            if (listToken.tagName === "li" && diff === 0 && !markupType.startsWith(
                                "markup.list"))
                                //is continuation of this li
                                break;

                            closeToken();

                            if (diff > 0)
                                break;
                        }
                    }
                    if (isPreviousEmpty)
                        parsedToken.tagName === "li" ? useParagraphForLi() : useParagraphForList(parsedToken);
                }
            }


            switch (parsedToken.tagName) {
                case "p":
                case "em":
                case "strong":
                    handleParagraph();
                    break;
                case "blockquote":
                case "code":
                    var requiredType = parsedToken.tagName === "blockquote" ? "string.blockquote"
                        : "support.function";
                    if (firstTokenType === "empty" || firstTokenType === requiredType) {
                        switch (parsedToken.name) {
                            case "githubblock":
                                var regExp = getGithubRegexp(true);
                                if (regExp.test(line)) {
                                    closeToken(2);
                                    shouldIgnoreLine = true;
                                    return;
                                }
                                else if (!parsedToken.isFirstLine) {
                                    parsedToken.children.push("\n");
                                }
                                parsedToken.isFirstLine = false;
                                break;
                            case "codeBlockInline":
                                if (parsedToken.children.length) {
                                    parsedToken.temporaryChildren.push("\n");
                                    if (line.trim().length) {
                                        parsedToken.children.push(...parsedToken.temporaryChildren);
                                        parsedToken.temporaryChildren = [];
                                    }
                                }
                                break;
                            case "codeSpan"://TODO
                                if (/^`+$/.test(line.trim())) {
                                    closeToken();
                                    shouldIgnoreLine = true;
                                    return;
                                }
                                if (parsedToken.children.length > 0)
                                    parsedToken.children.push(" ");

                                break;
                        }
                    }
                    else {
                        closeToken(2);
                    }
                    break;
                case "header":
                    closeToken();
                    break;
                case "li":
                    handleNewLineForLi();
                    break;
            }
        }

        function isHtml(token) {
            var tokenType = token.type;
            while (tokenType) {
                if (["html", "tag_stuff", "comment"].includes(tokenType.name))
                    return true;
                tokenType = tokenType.parent;
            }
            return false;
        }

        function shouldClose(token) {
            var typeName = token.type.name;
            if (!parsedToken)
                return false;
            if (parsedToken.isRawHtml) {
                return (typeName === "empty" && !isHtml(token))
                    || (parsedToken.tagName === "htmlBlock" && token.type.name.endsWith("tag-open.xml"));
            }
            switch (typeName) {
                case "empty":
                    return (parsedToken.tagName === "p" && !prevToken?.type.name.startsWith("string."))
                        || ["a", "img", "list", "header"].includes(parsedToken.tagName);
                case "paren.rpar":
                    return isLink(parsedToken);
                case "string.emphasis":
                    return (parsedToken.tagName === "em"
                        && !["emphasisState", "barEmphasisState"].includes(token.type.parent.name));
                case "string.strong":
                    return (parsedToken.tagName === "strong"
                        && !["strongState", "barStrongState"].includes(token.type.parent.name));
                default:
                    switch (parsedToken.tagName) {
                        case "code":
                            return (parsedToken.name === "codeSpan" && /^`+$/.test(token.value.trim()));
                        case "a":
                        case "img":
                            if (token.type.name === "text") {
                                return (token.value !== "]" && !token.type.parent.name.startsWith("link")) || token.value === "[";
                            } else if (token.type.name.startsWith("constant")) {
                                return false;
                            } else {
                                return !["punctuation", "paren.lpar", "markup.underline", "string"].includes(token.type.name);
                            }
                    }
                    return false;
            }
        }

        initLine();

        tryCloseList();
        tryCloseBlockquote();

        handleNewLine();

        if (shouldIgnoreLine)
            return;

        for (let j = 0; j < tokensLength; j++) {
            if (currToken)
                prevToken = currToken;
            currToken = tokens[j];
            nextToken = tokens[j + 1];

            var typeName = currToken.type.name;

            if (shouldClose(currToken)) {
                var shouldContinue = parsedToken.tagName !== "a";//TODO
                closeToken();
                if (shouldContinue)
                    continue;
            }
            if (typeName === "empty")
                continue;

            buildTokenTree(currToken.type.parent, currToken.value);
            parseToken(typeName, currToken.value, j === 0);
        }
    });
    closeToken(Infinity);

    return parsedTokens;
}

function renderMarkdown(string, parentHtml) {
    let parsedTokens = parseMarkdown(string);

    function getLinkLabel(token) {
        return JSON.stringify(token.children.map(child => (typeof child === "string") ? child.toLowerCase() : ""));//TODO circular
    }

    function renderTokens(tokens, parentHtml) {
        let l = tokens.length;
        for (let i = 0; i < l; i++) {
            let token = tokens[i];
            if (typeof token == "string") {
                dom.buildDom(token, parentHtml);
            } else {
                if (token.isReference)
                    continue;

                let arr = [token.tagName];
                var params = {};
                switch (token.tagName) {
                    case "a":
                    case "img":
                        if (parentHtml.innerHTML.endsWith("["))
                            parentHtml.innerHTML = parentHtml.innerHTML.substring(0, -1);

                        if (token.hasReference) {
                            var label = getLinkLabel(token);
                            var foundToken = parsedTokens.find((value) => value.isReference && getLinkLabel(value) === label);
                            if (foundToken) {
                                token = Object.assign(foundToken, token);
                            } else {
                                dom.buildDom("[" + token.children[0] + "]", parentHtml);
                                continue;
                            }
                        }

                        token.href ||= "";

                        if (token.tagName === "a") {
                            params["href"] = encodeURI(token.href);
                        } else {
                            params["src"] = token.href;
                            params["alt"] = token.children[0];
                            token.children = [];
                        }
                        params["title"] = token.title;

                        break;
                    case "list":
                        if (token.isOrdered) {
                            arr[0] = "ol";
                            var start = Number(token.start);
                            if (start !== 1)
                                arr.push({"start": start.toString()});
                        } else {
                            arr[0] = "ul";
                        }
                        break;
                    case "header":
                        arr[0] = "h" + token.heading;
                        break;
                    case "code":
                        if (token.info)
                            arr.push({"class": "language-" + token.info});
                        break;
                    case "htmlBlock":
                        renderTokens(token.children, parentHtml);
                        continue;
                }
                if (token.isRawHtml)
                    params = token.attributes;
                arr.push(params);
                let html = dom.buildDom(arr, parentHtml);
                if (token.children && token.children.length)
                    renderTokens(token.children, html);
            }
        }
    }

    parentHtml.innerHTML = "";
    renderTokens(parsedTokens, parentHtml);
}

exports.renderMarkdown = renderMarkdown;

