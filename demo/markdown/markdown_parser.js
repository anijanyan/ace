let src = "../../src/";

if (typeof process == "undefined") {//TODO dirty hack
    src = "ace/";
}

const CustomTokenizer = require(src + "tokenizer").CustomTokenizer;
const Tokenizer = CustomTokenizer;
const MarkdownHighlightRules = require(src + "mode/markdown_highlight_rules").MarkdownHighlightRules;
const Range = require(src + "range").Range;

var row = 0;
var column = 0;

class MarkdownToken {
    tagName;
    children = [];
    parentToken;
    params = {};
    from;
    range;

    constructor(tagName, parentToken, params) {
        this.tagName = tagName;
        this.parentToken = parentToken;
        this.params = params || {};
        this.from = this.getPoint();
    }

    createChildToken(tagName, params) {
        return new MarkdownToken(tagName, this, params);
    }

    addToken(tagName, params) {
        this.addChild(this.createChildToken(tagName, params));
    }

    updateTagName(tagName) {
        this.tagName = tagName;
    }

    createTextToken(value) {
        var textToken = this.createChildToken("textNode", {value: value});
        var to = {
            row: textToken.from.row,
            column: textToken.from.column + value.length
        };
        textToken.calcRange(to);
        return textToken;
    }

    addTextToken(value) {
        this.addChild(this.createTextToken(value));
    }

    addChild(child) {
        this.children.push(child);
    }

    addNewLine() {
        this.addToken("newLine");
    }

    getPoint() {
        return {row: row, column: column}
    }

    calcRange(to) {
        to ||= this.getPoint();
        this.range = Range.fromPoints(this.from, to);
    }

    getFirstParent(tagName) {
        if (this.tagName === tagName)
            return this;
        if (this.parentToken)
            return this.parentToken.getFirstParent(tagName);
        return null;
    }

    hasParent(tagName) {
        return this.getFirstParent(tagName)!== null;
    }

    isText() {
        return ["textNode", "em", "strong"].includes(this.tagName);
    }

    getLastChild() {
        return this.children[this.children.length - 1];
    }
}

class MarkdownParser {
    string = "";

    parsedTokens = [];
    /** @type {MarkdownToken} */
    parsedToken = null;

    currToken;
    nextToken;
    prevToken;

    blockquoteCount = 0;
    currLine;

    tokenizer = new Tokenizer(new MarkdownHighlightRules().getRules(), "markdown");

    lines;

    startState;
    lastToken;
    tokens;
    firstToken;
    firstTokenType;

    isEmptyLine = false;
    isPreviousEmpty = false;
    shouldIgnoreLine = false;
    isNewLine = false;

    init() {
        this.parsedTokens = [];
        this.parsedToken = undefined;

        this.currToken = undefined;
        this.nextToken = undefined;
        this.prevToken = undefined;
        this.startState = undefined;

        this.blockquoteCount = 0;
        row = 0;
        column = 0;

        this.isEmptyLine = false;
        this.isPreviousEmpty = false;
        this.shouldIgnoreLine = false;
        this.isNewLine = false;

        this.lines = this.string.split("\n").map((line) =>
            line.replace(`\r`, "")
                .replace(/^([ >]*)\t+/gm, (match, p1) => match.replace(/^ +/, "").replaceAll("\t", " ".repeat(4)))
        );
    }

    getGithubRegexp(toTheEnd) {
        var regexpLine = "^ *"
            + this.parsedToken.params.startingChar
            + "{" + this.parsedToken.params.startFence.length + ",}";
        if (toTheEnd)
            regexpLine += "$";
        return new RegExp(regexpLine);
    }

    handleStringEmphasis(tokenName, value) {
        if (this.parsedToken.tagName !== "em" && this.parsedToken.tagName !== "strong") {
            console.log("shouldn't get here");//TODO handle this error
            return;
        }
        var delimiter = this.parsedToken.params.del;
        if (tokenName === "string.strong")
            delimiter += delimiter;

        var length = delimiter.length;
        var shouldClose = false;

        var regexp = new RegExp("^\\" + this.parsedToken.params.del + "+$")
        if (regexp.test(value)) {
            var children = this.parsedToken.children;
            if (children.length > 0) {
                children.unshift(this.parsedToken.createTextToken(value));
            }

            this.removeToken();
            this.parsedToken.children.push(...children);
            this.parsedToken.addTextToken(value);
            return;
        }

        if (value.startsWith(delimiter)) {
            if (this.parsedToken.children.length > 0) {
                console.log("Something went wrong");
                return;
            }
            value = value.substring(length);
        }
        if (value.endsWith(delimiter)) {
            value = value.substring(0, value.length - length);
            shouldClose = true;
        }
        this.parsedToken.addTextToken(value);
        shouldClose && this.closeToken();
    }

    handleLinkTitle(value, isEscaped) {
        if (this.isNewLine && this.parsedToken.params.title !== undefined)
            this.parsedToken.params.title += "\n";
        this.isNewLine = false;
        this.parsedToken.params.quot ||= value.substring(0, 1);
        this.parsedToken.params.title ||= "";
        if (!isEscaped) {
            value = value.replaceAll(this.parsedToken.params.quot, "");
            if (this.parsedToken.params.quot === "(")//TODO
                value = value.replaceAll(")", "");
        }

        value = value.replaceAll('"', "&quot;");
        this.parsedToken.params.title += value;
    }

    getListParams(value) {
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

    handleList(value) {
        var params = this.getListParams(value);

        if (this.parsedToken) {
            if (this.parsedToken.tagName === "p" ||
                (this.parsedToken.tagName === "list"
                    && (this.parsedToken.params.isOrdered !== params.isOrdered ||
                        this.parsedToken.params.del !== params.del)))
                this.closeToken();
        }

        if (this.parsedToken && this.parsedToken.tagName === "list") {
            if (this.parsedToken.params.isOrdered !== params.isOrdered ||
                this.parsedToken.params.del !== params.del
            )
                this.closeToken();
        }

        if (!this.parsedToken || this.parsedToken.tagName !== "list")
            this.openToken("list", params);
    }

    getBlockquoteMatch(value) {
        var match = value.match(/^ *([> ]+)/);
        if (!match)
            return "";
        return match[0];
    }

    getBlockquoteCount(value) {
        return this.getBlockquoteMatch(value).replaceAll(" ", "").length;
    }

    removeBlockquote(value) {
        return value.replace(this.getBlockquoteMatch(value), "");
    }

    isLink(token) {
        return token && (token.tagName === "a" || token.tagName === "img")
    }


    isHtml(token) {
        var tokenType = token.type;
        while (tokenType) {
            if (["html", "tag_stuff", "comment"].includes(tokenType.name))
                return true;
            tokenType = tokenType.parent;
        }
        return false;
    }

    buildTokenTree(type, value, childTag) {
        var tryBuildParent = () => {
            if (!type.parent)
                return;

            if (this.parsedToken) {
                if (tagName === "li" && this.parsedToken.tagName === "list" && this.parsedToken.params.indent === type.indent) {
                    return;
                } else if (this.isLink(this.parsedToken)) {
                    return;
                }
            }
            this.buildTokenTree(type.parent, value, tagName);
        }
        if (this.isLink(this.parsedToken)) {
            if (type.name.startsWith("linkDestination")) {
                if (type.name === "linkDestination")
                    this.parsedToken.isReference = true;
                return;
            } else if (value === "]" || value === "],") {
                this.parsedToken.hasReference = true;
                return;
            } else if (type.name === "paragraph" || type.name === "header") {
                return;
            }
        }

        let tagName = this.getTokenHtmlTag(type.name);

        if (tagName) {
            switch (tagName) {
                case "li":
                    if (value.trim() === "") {
                        return;
                    } else if (this.parsedToken) {
                        if (this.parsedToken.tagName === "p" && this.parsedToken.parentToken && this.parsedToken.parentToken.tagName === "li")
                            return;
                        if ((this.parsedToken.tagName === tagName) && (!type.indent || type.indent === this.parsedToken.params.indent))
                            return;
                        if (this.parsedToken.params.isRawHtml && this.currToken.type.name.endsWith(".xml"))
                            return;
                    }
                    break;
                case "p":
                    if (this.parsedToken && this.parsedToken.tagName === tagName)
                        return;
                    if (childTag === "header")
                        return;
                    break;
                case "blockquote":
                    var count = this.getBlockquoteCount(value);
                    var i = 1;
                    if (this.parsedToken) {
                        var blockquoteToken;
                        if (this.parsedToken.tagName === tagName) {
                            blockquoteToken = this.parsedToken;
                        } else if (this.parsedToken.params.isRawHtml) {
                            var parent = this.parsedToken;
                            while (parent) {
                                if (parent.tagName === tagName) {
                                    blockquoteToken = parent;
                                    break;
                                }
                                parent = parent.parentToken;
                            }
                        } else if (this.parsedToken.tagName === "p") {
                            if (!this.parsedToken.parentToken) {
                                this.closeToken();
                            } else if (this.parsedToken.parentToken.tagName === tagName) {
                                blockquoteToken = this.parsedToken.parentToken;
                            }
                        }
                        if (blockquoteToken) {
                            if (blockquoteToken.params.level >= count) {
                                return;
                            } else {
                                i = blockquoteToken.params.level;
                            }
                        }

                        if (this.parsedToken && this.parsedToken.tagName === "li") {//TODO!!!!
                            i = this.blockquoteCount + 1;
                        }
                    }
                    this.blockquoteCount = count;
                    for (; i <= count; i++) {
                        this.openToken(tagName, {level: i});
                    }
                    return;
                case "rawHtml"://TODO
                    if (this.currToken.type.name.endsWith("tag-name.xml")) {
                        if (!this.prevToken.type.name.endsWith("tag-open.xml"))
                            return;
                        tagName = this.currToken.value;
                        if (this.prevToken.type.name.endsWith("end-tag-open.xml")) {
                            if (this.parsedToken && this.parsedToken.hasParent(tagName)) {
                                var done = false;
                                while (this.parsedToken && !done) {
                                    done = this.parsedToken.tagName === tagName;
                                    this.closeToken();
                                }
                            } else {
                                this.openToken("htmlBlock", {isRawHtml: true});

                                this.parsedToken.addTextToken("</" + tagName + ">");
                            }

                            return;
                        }
                    } else {
                        return;
                    }

                    this.openToken(tagName, {isRawHtml: true});
                    return;
                default:
                    if (this.parsedToken && this.parsedToken.tagName === tagName)
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
                    this.openToken("pre");
                } else {
                    if (!this.parsedToken)
                        this.openToken("p");
                }
                params.name = type.name;
                switch (type.name) {
                    case "githubblock":
                        params.isFirstLine = true;
                        params.startingChar = value.trimStart()[0];
                        var regexp = new RegExp("^" + params.startingChar + "+");
                        params.indent = value.match(/^\s*/)[0].length;
                        if (this.parsedToken.parentToken && this.parsedToken.parentToken.tagName === "li")
                            params.indent += this.prevToken.value.length;
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
                this.handleList(value);
                params.isUsingP = this.parsedToken.params.isUsingP;
                break;
            case "a":
            case "img":
                if (this.parsedToken && this.parsedToken.tagName === "p"
                    && this.prevToken && this.prevToken.value.endsWith("[")) {
                    var lastChild = this.parsedToken.getLastChild();
                    lastChild.params.value = lastChild.params.value.slice(0, -1);
                }
                break;
        }

        this.openToken(tagName, params);
    }

    getTokenHtmlTag(typeName) {
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

    openToken(tagName, params) {
        this.parsedToken = new MarkdownToken(tagName, this.parsedToken, params);
    }

    closeToken(count) {
        count ??= 1;
        if (!this.parsedToken)
            return;

        this.parsedToken.calcRange();

        var parentToken = this.parsedToken.parentToken;

        if (this.parsedToken.isReference) {
            this.parsedTokens.push(this.parsedToken);
            this.parsedToken = null;
            if (parentToken.tagName === "p")
                return;
        }

        if (this.parsedToken) {
            switch (this.parsedToken.tagName) {
                case "header":
                case "p":
                    if (this.parsedToken.tagName === "p" && !this.parsedToken.children.length) {
                        this.parsedToken = null;
                        break;
                    }

                    var lastChild = this.parsedToken.getLastChild();
                    if (lastChild) {
                        switch (lastChild.tagName) {
                            case "newLine":
                            case "br":
                                this.parsedToken.children.pop();
                                break;
                            case "textNode":
                                lastChild.params.value = lastChild.params.value.trimEnd();
                                break;
                        }
                    }
                    break;
                case "li":
                    if (this.parsedToken.params.isUsingP && !parentToken.params.isUsingP)
                        this.useParagraphForList(parentToken);
                    break;
            }
        }

        if (parentToken) {
            this.parsedToken && parentToken.children.push(this.parsedToken);
            this.parsedToken = parentToken;
            if (count > 1)
                return this.closeToken(count - 1);
        } else if (this.parsedToken) {
            this.parsedTokens.push(this.parsedToken);
            this.parsedToken = null;
        }
    }

    useParagraphForList(token) {
        token.params.isUsingP = true;
        token.children.forEach((childToken) => {
            this.startUsingParagraphForLi(childToken);
        })
    }

    startUsingParagraphForLi(token) {
        if (token.params.isUsingP)
            return;

        token.params.isUsingP = true;

        var children = token.children;
        token.children = [];

        var paragraph;
        children.forEach((child, i) => {
            if (child.tagName === "list") {
                if (paragraph) {
                    token.addChild(paragraph);
                    paragraph = null;
                }
                token.addChild(child);
            } else {
                if (!paragraph)
                    paragraph = token.createChildToken("p");
                paragraph.addChild(child);
            }
        });
        if (paragraph)
            token.addChild(paragraph);
    }


    useParagraphForLi() {
        this.startUsingParagraphForLi(this.parsedToken);
        if (!this.isPreviousEmpty && this.parsedToken.getLastChild().tagName === "p") {
            this.parsedToken = this.parsedToken.children.pop();
            this.handleParagraph();
        }
    }

    removeToken() {
        this.parsedToken = this.parsedToken.parentToken;
    }

    handleParagraph() {
        if (this.firstTokenType === "empty") {
            this.closeToken();
            this.shouldIgnoreLine = true;
            return;
        }

        var checkLine = this.currLine;
        if (this.blockquoteCount > 0)
            checkLine = this.removeBlockquote(checkLine);
        if (checkLine.trim() === "")
            return;

        if (this.firstTokenType === "constant.thematic_break")
            return;

        var lastChild = this.parsedToken.getLastChild();
        if (this.firstTokenType.startsWith("markup.heading.")) {
            if (["=", "-"].includes(this.firstToken.value.trim()[0])) {
                this.parsedToken.updateTagName("header");
            } else {
                this.closeToken();
            }
        } else {
            if (!lastChild || !lastChild.isText())
                return;

            if (lastChild.tagName === "textNode") {
                if (lastChild.params.value.endsWith("\\") || lastChild.params.value.endsWith("  ")) {
                    lastChild.params.value = lastChild.params.value.slice(0, -1);
                    this.parsedToken.addToken("br");
                }
                lastChild.params.value = lastChild.params.value.trimEnd();
            }

            this.parsedToken.addNewLine();
        }
    }

    tryCloseList() {
        if (!this.parsedToken || this.parsedToken.tagName !== "li")
            return;
        var parentToken = this.firstToken.type.parent;
        while (parentToken) {
            if (parentToken.name.startsWith("list"))
                return;
            parentToken = parentToken.parent;
        }
        this.closeToken(2);
    }

    tryCloseBlockquote() {
        if (!this.parsedToken || this.blockquoteCount === 0)
            return;
        if (["p", "em", "strong"].includes(this.parsedToken.tagName) && this.firstTokenType.startsWith("string"))
            return;
        var count = this.getBlockquoteCount(this.currLine);
        if (count >= this.blockquoteCount)
            return;

        while (this.parsedToken && this.blockquoteCount > count) {
            if (this.parsedToken.tagName === "blockquote")
                this.blockquoteCount--;
            this.closeToken();
        }
    }

    parseToken(name, value, isStartLine) {
        var addChildValue = () => {
            if (!value.length)
                return;
            if (!this.parsedToken) {
                console.log("Should not get here");
                return;
            }
            if (this.isLink(this.parsedToken) && !name.startsWith("constant"))
                return;
            this.parsedToken.addTextToken(value);
        }

        if (name.startsWith("markup.heading.")) {
            if (/^#+$/.test(value) && this.parsedToken.tagName === "p") //TODO hacked
                this.parsedToken.updateTagName("header");
            if (!this.parsedToken) {
                this.openToken("p");
                addChildValue();
            } else {
                this.parsedToken.params.heading = name.split(".")[2];
            }

            return;
        }
        if (name.startsWith("markup.list") && this.parsedToken.tagName === "li") {
            this.parsedToken.params.indent = Number(name.split(".")[2]) || value.length;//TODO
            this.parsedToken.parentToken.params.indent = this.parsedToken.params.indent;
            return;
        }
        if (name.endsWith(".xml")) {
            var nameData = name.split(".");
            var tagName = nameData[nameData.length - 2];
            switch (tagName) {
                case "attribute-name":
                    this.parsedToken["attributes"] ||= {};
                    this.parsedToken.attributeName = value;
                    return;
                case "attribute-value":
                    this.parsedToken["attributes"][this.parsedToken.attributeName] ||= "";
                    this.parsedToken["attributes"][this.parsedToken.attributeName] += value.replaceAll('"', "");//TODO
                    if (value.endsWith('"'))
                        this.parsedToken.attributeName = null;
                    return;
                case "tag-close":
                    this.parsedToken.doneAttributes = true;
                    return;
            }
            return;
        } else if (this.parsedToken && this.parsedToken.tagName === "htmlBlock") {
            return addChildValue();
        }
        switch (name) {
            case "constant.thematic_break":
                this.closeToken(Infinity);
                this.openToken("hr");
                return this.closeToken();
            case "text":
            case "heading":
            case "constant":
                if (this.parsedToken && this.parsedToken.params.isRawHtml) {
                    this.parsedToken.addTextToken(value);
                    return;
                }
                if (name === "heading") {
                    if ((!this.nextToken || this.nextToken.type.name !== "constant.language.escape")
                        && !(/^#+$/.test(value) && this.parsedToken.children[this.parsedToken.children.length - 1] === "#"))
                        value = value.replace(/ +#+ *$/, "");
                } else if (name === "text" && (this.nextToken?.type.name === "url" || this.prevToken?.type.name === "url")) {
                    return;
                } else if (!this.currToken.type.parent.name.startsWith("linkDestination")
                    && this.isLink(this.parsedToken) && value === "]") {
                    this.closeToken();
                    value = value.replace("]", "");
                }
                if (!this.parsedToken || !this.parsedToken.children.length || isStartLine)
                    value = value.trimStart();

                return addChildValue();
            case "support.function":
                if (!this.parsedToken) {
                    console.log("Error: empty parsedToken");
                    return;
                }
                var parent = this.parsedToken.parentToken;
                var indent = 4;
                while (parent) {
                    if (parent.tagName === "blockquote") {
                        value = value.replace(/^ /, "");
                        break;
                    } else if (parent.tagName === "li") {
                        indent += parent.params.indent;
                    }
                    parent = parent.parentToken;
                }
                if (!parent) {
                    switch (this.parsedToken.params.name) {
                        case "githubblock":
                            if (this.parsedToken.params.isFirstLine) {
                                value = value.replace(this.getGithubRegexp(), "").trimStart();
                                this.parsedToken.params.info = value.split(" ")[0];
                                return;
                            } else if (this.parsedToken.params.indent) {
                                var regexp = "^ {1," + this.parsedToken.params.indent + "}"
                                value = value.replace(new RegExp(regexp), "");
                            }
                            break;
                        case "codeSpan":
                            value = value.replace(/^`+/, "").replace(/^ (.+) $/, '$1');
                            break;
                        default:
                            value = this.currLine.substring(indent);
                            break;
                    }
                }
                if (this.parsedToken.params.name === "codeBlockInline" && !value.trim().length) {
                    this.parsedToken.params.temporaryChildren.push(value);
                    return;
                }
                if (!value.length)
                    return;
                return addChildValue();
            case "list":
                if (this.parsedToken.params.isUsingP && this.parsedToken.tagName !== "p")
                    this.openToken("p");
                if (this.parsedToken.tagName === "li")
                    this.handleParagraph();
                return addChildValue();
            case "string.emphasis":
            case "string.strong":
                return this.handleStringEmphasis(name, value);
            case "constant.language.escape":
                value = value.replace(/\\(.)/g, '$1');
                if (this.isLink(this.parsedToken) && this.currToken.type.parent.name.startsWith("string"))
                    return this.handleLinkTitle(value, true);
                return addChildValue();
            case "markup.underline":
                this.parsedToken.params.href = value;
                return;
            case "string":
                return this.handleLinkTitle(value);
            case "string.blockquote":
                value = this.removeBlockquote(value);
                if (!value.length) {
                    if (this.parsedToken.tagName === "p")
                        this.closeToken();
                    return;
                }
                if (!this.parsedToken) {
                    console.log("should not get here");
                    return;
                }
                if (!this.parsedToken.params.isRawHtml && this.parsedToken.tagName !== "p")
                    this.openToken("p");
                addChildValue();
                return;
            case "url":
                this.openToken("p");
                this.openToken("a");
                this.parsedToken.addTextToken(value);
                this.parsedToken.params.href = "";
                if (/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(value))//TODO
                    this.parsedToken.params.href = "mailto:";
                this.parsedToken.params.href += value;
                this.closeToken(2);
                return;
        }
    }

    initLine(line) {
        this.currLine = line;

        this.shouldIgnoreLine = false;
        this.isNewLine = true;

        var data = this.tokenizer.getLineTokens(this.currLine, this.startState);
        this.tokens = data.tokens;

        this.firstToken = this.tokens[0];
        this.firstTokenType = this.firstToken.type.name;
        this.isEmptyLine = this.firstTokenType === "empty";

        this.lastToken = this.tokens.at(-1);
        this.startState = (this.lastToken !== undefined
            && this.lastToken.type !== undefined
            && this.lastToken.type.parent !== undefined)
            ? this.lastToken.type.parent : data.state;
    }

    getMarkupType() {
        var markupType = this.firstTokenType;
        if (["indent", "string.blockquote"].includes(markupType))
            markupType = this.tokens[1] ? this.tokens[1].type.name : null;
        return markupType;
    }

    handleNewLineForLi() {
        if (this.isEmptyLine) {
            this.shouldIgnoreLine = true;
            return;
        }
        var markupType = this.getMarkupType();
        if (!markupType)
            return;

        if (markupType.startsWith("markup.list") || (markupType === "list" && this.firstTokenType
            === "indent" && this.isPreviousEmpty)) {
            var newIndent = markupType.startsWith("markup.list") ? Number(markupType.split(".")[2])
                : this.firstToken.value.length;
            while (this.parsedToken && (["li", "list"].includes(this.parsedToken.tagName)
                || this.parsedToken.params.isRawHtml)) {
                var listToken = this.parsedToken.params.isRawHtml
                    ? this.parsedToken.getFirstParent("li")
                    : this.parsedToken;
                var diff = newIndent - listToken.params.indent;

                if (diff >= 2)//should create sublist
                    break;

                if (listToken.tagName === "list" && (diff === 0 || !listToken.parentToken))
                    //should create list item in current list
                    break;


                if (listToken.tagName === "li" && diff === 0 && !markupType.startsWith("markup.list"))
                    //is continuation of this li
                    break;

                this.closeToken();

                if (diff > 0)
                    break;
            }
        }
        if (this.isPreviousEmpty)
            this.parsedToken.tagName === "li" ? this.useParagraphForLi() : this.useParagraphForList(this.parsedToken);
    }

    handleNewLineForCodeBlock() {
        var requiredType = this.parsedToken.tagName === "blockquote" ? "string.blockquote"
            : "support.function";
        if (this.firstTokenType === "empty" || this.firstTokenType === requiredType) {
            switch (this.parsedToken.params.name) {
                case "githubblock":
                    var regExp = this.getGithubRegexp(true);
                    if (regExp.test(this.currLine)) {
                        this.shouldIgnoreLine = true;
                        this.closeToken(2);
                        return
                    } else if (!this.parsedToken.params.isFirstLine) {
                        this.parsedToken.addNewLine();
                    }
                    this.parsedToken.params.isFirstLine = false;
                    return;
                case "codeBlockInline":
                    if (this.parsedToken.children.length) {
                        this.parsedToken.params.temporaryChildren.push("\n");
                        if (this.currLine.trim().length) {
                            for (var child of this.parsedToken.params.temporaryChildren) {
                                if (child === "\n") {
                                    this.parsedToken.addNewLine();
                                } else {
                                    this.parsedToken.addTextToken(child);
                                }
                            }
                            this.parsedToken.params.temporaryChildren = [];
                        }
                    }
                    return;
                case "codeSpan"://TODO
                    if (/^`+$/.test(this.currLine.trim())) {
                        this.closeToken();
                        this.shouldIgnoreLine = true;
                    } else if (this.parsedToken.children.length > 0) {
                        this.parsedToken.addTextToken(" ");
                    }

                    return;
            }
        } else {
            return this.closeToken(2);
        }
    }

    handleNewLineForRawHtml() {
        if (this.parsedToken.hasParent("li"))
            return this.handleNewLineForLi();
        if (this.isHtml(this.tokens[0]) || this.blockquoteCount > 0) {
            if (this.parsedToken.doneAttributes) {
                this.parsedToken.addNewLine();
            } else if (this.parsedToken.attributeName) {
                this.parsedToken.attributes[this.parsedToken.attributeName] += "\n";
            }
        }
    }


    handleNewLine() {
        if (!this.parsedToken)
            return;

        if (this.parsedToken.params.isRawHtml)
            return this.handleNewLineForRawHtml();

        if (this.parsedToken.tagName === "p"
            && this.parsedToken.parentToken
            && this.parsedToken.parentToken.tagName === "li") {
            if (this.getMarkupType() !== "list") {
                this.closeToken();
            }
        }

        switch (this.parsedToken.tagName) {
            case "p":
            case "em":
            case "strong":
                return this.handleParagraph();
            case "blockquote":
            case "code":
                return this.handleNewLineForCodeBlock();
            case "header":
                return this.closeToken();
            case "li":
                return this.handleNewLineForLi();
        }
    }

    shouldCloseCurrToken() {
        var currTokenType = this.currToken.type;
        var currTokenTypeName = currTokenType.name;
        if (!this.parsedToken)
            return false;
        if (this.parsedToken.params.isRawHtml) {
            return (currTokenTypeName === "empty" && !this.isHtml(this.currToken))
                || (this.parsedToken.tagName === "htmlBlock" && currTokenTypeName.endsWith("tag-open.xml"));
        }
        switch (currTokenTypeName) {
            case "empty":
                return ["a", "img", "list", "header"].includes(this.parsedToken.tagName);
            case "paren.rpar":
                return this.isLink(this.parsedToken);
            case "string.emphasis":
                return (this.parsedToken.tagName === "em"
                    && !["emphasisState", "barEmphasisState"].includes(currTokenType.parent.name));
            case "string.strong":
                return (this.parsedToken.tagName === "strong"
                    && !["strongState", "barStrongState"].includes(currTokenType.parent.name));
            default:
                switch (this.parsedToken.tagName) {
                    case "code":
                        return (this.parsedToken.params.name === "codeSpan" && /^`+$/.test(this.currToken.value.trim()));
                    case "a":
                    case "img":
                        if (currTokenTypeName === "text") {
                            return (this.currToken.value !== "]" && !currTokenType.parent.name.startsWith("link")) || this.currToken.value === "[";
                        } else if (currTokenTypeName.startsWith("constant")) {
                            return false;
                        } else {
                            return !["punctuation", "paren.lpar", "markup.underline", "string"].includes(currTokenTypeName);
                        }
                }
                return false;
        }
    }

    parse(string) {
        this.string = string;
        this.init();

        this.lines.forEach((line, i) => {
            row = i;

            this.initLine(line);

            this.tryCloseList();
            this.tryCloseBlockquote();

            this.handleNewLine();

            this.isPreviousEmpty = this.isEmptyLine;

            if (this.shouldIgnoreLine)
                return;

            column = 0;
            for (let j = 0; j < this.tokens.length; j++) {
                if (this.currToken)
                    this.prevToken = this.currToken;
                this.currToken = this.tokens[j];
                this.nextToken = this.tokens[j + 1];

                var typeName = this.currToken.type.name;

                var shouldCloseToken = this.shouldCloseCurrToken();

                if (shouldCloseToken) {
                    column += this.currToken.value.length;
                    var shouldContinue = this.parsedToken.tagName !== "a";//TODO
                    this.closeToken();
                    if (shouldContinue)
                        continue;
                }
                if (typeName === "empty")
                    continue;

                var value = this.currToken.value;
                this.buildTokenTree(this.currToken.type.parent, value);
                this.parseToken(typeName, value, j === 0);
                if (!shouldCloseToken)
                    column += value.length;
            }
        });
        this.closeToken(Infinity);

        return this.parsedTokens;
    }
}


exports.MarkdownParser = MarkdownParser;

