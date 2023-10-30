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

    var currToken, nextToken;

    //TODO: check is markdown

    const tokenizer = new Tokenizer(new MarkdownHighlightRules().getRules(), "markdown");
    let lines = string.split("\n");

    let currRules = {};

    let rules = {
        "a": {
            "valid": ["constant", "markup.underline"],
            "close": ["paren.rpar"],
            "disabled": true
        },
        "p": {
            "close": ["empty"]
        },
        "list": {
            "close": ["empty"]
        },
        "li": {
            "close": ["empty"],
        },
        "header": {
            "close": ["empty"],
        },
        "code": {
            "ignore": ["empty"]
        }
    }

    function init() {
        currRules = rules[parsedToken?.tagName] || {};
    }

    function shouldIgnore(typeName) {
        return (currRules["ignore"] && currRules.ignore.includes(typeName))
            || (currRules["valid"] && !currRules.valid.includes(typeName))
    }

    function shouldClose(typeName) {
        return currRules["close"] && currRules.close.includes(typeName)
    }

    function parseToken(name, value, isStartLine) {
        function addChildValue() {
            if (!value.length)
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
        switch (name) {
            case "constant.thematic_break":
                if (parsedToken && (parsedToken.tagName === "list" || parsedToken.tagName === "p"))
                    closeToken();
                openToken("hr");
                closeToken();
                return;
            case "text":
            case "heading":
            case "constant":
                if (name === "heading") {
                    if ((!nextToken || nextToken.type.name !== "constant.language.escape")
                        && !(/^#+$/.test(value) && parsedToken.children[parsedToken.children.length - 1] === "#"))
                        value = value.replace(/ +#+ *$/, "");
                }
                if (!parsedToken.children.length || isStartLine)
                    value = value.trimStart();
                if (!nextToken || shouldClose(nextToken.type.name))
                    value = value.trimEnd();

                return addChildValue();
            case "support.function":
                var parent = parsedToken.parentToken;
                while (parent) {
                    if (parent.tagName === "blockquote") {
                        value = value.replace(/^ /, "");
                        break;
                    }
                    parent = parent.parentToken;
                }
                if (!parent) {
                    switch (parsedToken.params.name) {
                        case "githubblock":
                            value = getGithubBlockValue(value);
                            break;
                        case "codeSpan":
                            value = value.replaceAll("`", "");
                            break;
                        default:
                            value = value.substring(4);
                            break;
                    }
                }
                if (parsedToken.params.name === "codeBlockInline" && !value.trim().length) {
                    parsedToken.temporaryChildren ??= [];
                    parsedToken.temporaryChildren.push(value);
                    return;
                }
                return addChildValue();
            case "list":
                if (!parsedToken)
                    console.log("aaaaaaaaaaaaa");
                return addChildValue();
            case "string.emphasis":
            case "string.strong":
                return handleStringEmphasis(name, value);
            case "constant.language.escape":
                value = value.replace(/\\(.)/g, '$1');
                return addChildValue();
            case "markup.underline":
                parsedToken.href = value;
                return;
            case "string.blockquote":
                value = value.replace(">", "").trimStart();
                if (!value.length)
                    return;
                openToken("p");
                addChildValue();
                return closeToken();
        }
    }

    function getGithubBlockValue(value) {
        var regexpLine = "^ *"
            + parsedToken.params.startingChar
            + "{" + parsedToken.params.startFence.length + ",}";
        if (new RegExp(regexpLine + "$").test(value))
            return "";
        return value.replace(new RegExp(regexpLine), "");
    }

    function handleStringEmphasis(tokenName, value) {
        var delimiter = tokenName === "string.strong" ? "**" : "*";
        var length = delimiter.length;
        var shouldClose = false;

        if (/^\*+$/.test(value)) {
            removeToken();
            parsedToken.children.push(value);
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

    function handleList(value) {
        value = value.trim();
        let params = {};
        params.isOrdered = !("*+-".includes(value));
        if (!params.isOrdered) {
            params.del = value;
        } else {
            params.del = value.slice(-1);
            params.start = value.slice(0, -1);
        }

        if (parsedToken?.tagName === "list") {
            if (parsedToken.params.isOrdered !== params.isOrdered ||
                parsedToken.params.del !== params.del
            )
                closeToken();
        }

        if (parsedToken?.tagName !== "list")
            openToken("list", params)
    }

    function buildTokenTree(type, value, childTag) {
        let tagName = getTokenHtmlTag(type.name, value);
        if (tagName && parsedToken?.tagName === tagName)
            return;

        if (tagName === "p" && childTag === "header")
            return;

        if (type.parent)
            buildTokenTree(type.parent, value, tagName);

        var params = {};
        if (tagName === "code") {
            if (type.name !== "codeSpan")
                openToken("pre");
            params.name = type.name;
            if (params.name === "githubblock") {
                params.startingChar = value.trimStart()[0];
                var regexp = new RegExp("^" + params.startingChar + "+");
                params.startFence = regexp.exec(value.trimStart())[0];
            }
        } else if (tagName === "li")
            handleList(value);

        if (tagName)
            openToken(tagName, params);
    }

    function getTokenHtmlTag(typeName, value) {
        switch (typeName) {
            case 'paragraph':
                return "p";
            case 'linkLabel':
                return "a";
            case 'listBlock':
                return "li";
            case 'header':
                return "header";
            case 'codeSpan':
            case 'githubblock':
            case 'codeBlockInline':
                return "code";
            case 'emphasisState':
                return "em";
            case 'strongState':
                return "strong";
            case 'blockquote':
                return "blockquote";
            default:
                return null;
        }
    }

    function updateToken(tagName) {
        parsedToken.tagName = tagName;
        init();
    }

    function openToken(tagName, params) {
        parsedToken = {
            tagName: tagName,
            children: [],
            params: params,
            parentToken: parsedToken
        }

        init();
    }

    function closeToken(count) {
        count ??= 1;
        if (!parsedToken)
            return;
        var parentToken = parsedToken.parentToken;
        if (parentToken) {
            if (parsedToken.tagName !== "p" || parsedToken.children.length) {//TODO ignore empty paragraphs
                parentToken.children.push(parsedToken);
            }
            parsedToken = parsedToken.parentToken;
            if (count > 1)
                return closeToken(count - 1);
        } else {
            parsedTokens.push(parsedToken);
            parsedToken = null;
        }
        init();
    }

    function removeToken() {
        parsedToken = parsedToken.parentToken;
        init();
    }

    var startState;

    lines.forEach(function(line, i) {
        line = line.replace(`\r`, "");
        line = line.replace(/^([ >]*)\t+/gm, (match, p1) => match.replace(/^ +/, "").replaceAll("\t", " ".repeat(4)));

        var data = tokenizer.getLineTokens(line, startState);
        let tokens = data.tokens;

        var firstToken = tokens[0];
        var firstTokenType = firstToken.type.name;

        if (parsedToken) {
            switch (parsedToken.tagName) {
                case "p":
                    if (line === "")
                        break;

                    if (firstTokenType.startsWith("markup.heading.")) {
                        if (["=", "-"].includes(firstToken.value.trim()[0])) {
                            updateToken("header");
                        } else {
                            closeToken();
                        }
                    } else if (firstTokenType !== "constant.thematic_break") {
                        parsedToken.children.push("\n");
                    }
                    break;
                case "em":
                case "strong":
                    parsedToken.children.push("\n");
                    break;
                case "blockquote":
                case "code":
                    var requiredType = parsedToken.tagName === "blockquote" ? "string.blockquote" : "support.function";
                    parsedToken.temporaryChildren ??= [];
                    if (firstTokenType === "empty") {
                        parsedToken.temporaryChildren.push("\n");
                    } else if (firstTokenType === requiredType) {
                        var checkLine;

                        if (parsedToken.params.name === "githubblock") {
                            checkLine = getGithubBlockValue(line);
                        } else {
                            checkLine = line.trim();
                            if (parsedToken.params.name === "codeSpan") {
                                checkLine = checkLine.replace("``", "");
                            }
                        }

                        if (checkLine.length)
                            parsedToken.temporaryChildren.push("\n");

                        parsedToken.children.length && parsedToken.children.push(...parsedToken.temporaryChildren);
                        parsedToken.temporaryChildren = [];
                        if (!checkLine.length)
                            parsedToken.temporaryChildren.push("\n");
                    } else {
                        closeToken(2);
                    }

                    break;
                case "header":
                    closeToken();
                    break;
                case "li":
                    closeToken();
                    break;
            }
        }

        var l = tokens.length;
        for (let j = 0; j < l; j++) {
            currToken = tokens[j];
            nextToken = tokens[j + 1];

            var typeName = currToken.type.name;

            if (shouldClose(typeName)) {
                if (parsedToken.tagName !== "p" || !tokens[j - 1]?.type.name.startsWith("string.")) {
                    closeToken();
                    continue;
                }
            } else if (shouldIgnore(typeName)) {
                continue;
            }

            if (!currRules["disabled"])
                buildTokenTree(currToken.type.parent, currToken.value);

            if (!shouldIgnore(typeName))
                parseToken(typeName, currToken.value, j === 0);
        }

        var lastToken = tokens[l - 1];
        startState = (lastToken !== undefined && lastToken.type !== undefined && lastToken.type.parent !== undefined)
            ? lastToken.type.parent : data.state;
    });
    closeToken(Infinity);
    // while (parsedToken && parsedToken.parentToken) {
    //     parsedToken = parsedToken.parentToken;
    // }
    // if (parsedToken)
    //     parsedTokens.push(parsedToken);
    return parsedTokens;
}

function renderMarkdown(string, parentHtml) {
    let parsedTokens = parseMarkdown(string);

    function renderTokens(tokens, parentHtml) {
        let l = tokens.length;
        for (let i = 0; i < l; i++) {
            let token = tokens[i];
            if (typeof token == "string") {
                dom.buildDom(token, parentHtml);
            } else {
                let arr = [token.tagName];
                switch (token.tagName) {
                    case "a":
                        if (parentHtml.innerHTML.lastIndexOf("[") === parentHtml.innerHTML.length - 1)  {
                            parentHtml.innerHTML = parentHtml.innerHTML.substring(0, parentHtml.innerHTML.length-1)
                        }

                        arr.push({"href": token.href});
                        break;
                    case "list":
                        if (token.params.isOrdered) {
                            arr[0] = "ol";
                            if (token.params.start > 1)
                                arr.push({"start": token.params.start});
                        } else {
                            arr[0] = "ul";
                        }
                        break;
                    case "header":
                        arr[0] = "h" + token.heading;
                        break;
                }
                let html = dom.buildDom(arr, parentHtml);
                if (token.children.length)
                    renderTokens(token.children, html);
            }
        }
    }

    parentHtml.innerHTML = "";
    renderTokens(parsedTokens, parentHtml);
}

exports.renderMarkdown = renderMarkdown;

