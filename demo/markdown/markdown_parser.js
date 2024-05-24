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
var endColumn = 0;

function isMail(href) {
    return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(href);
}

class MarkdownToken {
    tagName;
    children = [];
    parentToken;
    params = {};
    options = {};
    from;
    range;

    constructor(tagName, params, parentToken) {
        this.tagName = tagName;
        this.params = params || {};
        this.parentToken = parentToken;
        this.options = this.params.options || {};
        this.from = this.getStartPoint();
    }

    createChildToken(tagName, params) {
        return new MarkdownToken(tagName, params);
    }

    addToken(tagName, params) {
        var token = this.createChildToken(tagName, params);
        token.calcRange();
        this.addChild(token);
    }

    updateTagName(tagName) {
        this.tagName = tagName;
    }

    createTextToken(value, isEscaped) {
        var params = {value: value, isEscaped: isEscaped || false};
        var textToken = this.createChildToken("textNode", params);
        textToken.calcRange();
        return textToken;
    }

    addTextToken(value, isEscaped) {
        if (!value.length)
            return;
        this.addChild(this.createTextToken(value, isEscaped));
    }

    addChild(child) {
        child.parentToken = this;
        this.children.push(child);
    }

    addNewLine() {
        this.addToken("newLine");
    }

    getStartPoint() {
        return {row: row, column: column}
    }

    getEndPoint() {
        return {row: row, column: endColumn}
    }

    calcRange() {
        this.range = Range.fromPoints(this.from, this.getEndPoint());
    }

    is(tagName) {
        return typeof tagName === "string" ? this.tagName === tagName : tagName.includes(this.tagName);
    }

    isMail() {
        return isMail(this.params.href);
    }

    parentIs(tagName) {
        return this.parentToken && this.parentToken.is(tagName);
    }

    getFirstParent(tagName) {
        if (this.is(tagName))
            return this;
        if (this.parentToken)
            return this.parentToken.getFirstParent(tagName);
        return null;
    }

    hasParent(tagName) {
        return this.getFirstParent(tagName) !== null;
    }

    isText() {
        return ["textNode", "em", "strong"].includes(this.tagName);
    }

    getLastChild() {
        return this.children[this.children.length - 1];
    }

    addAttribute(attributeName, attributeValue) {
        this.options[attributeName] = attributeValue;
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

    //extensions
    isTableExtension = false;
    tableData = [];

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
        endColumn = 0;

        this.isEmptyLine = false;
        this.isPreviousEmpty = false;
        this.shouldIgnoreLine = false;
        this.isNewLine = false;

        this.isTableExtension = false;
        this.tableData = [];

        this.lines = this.string.split("\n").map((line) =>
            line.replace(`\r`, "")
                .replace(/^([ >]*)\t+/gm, (match, p1) => match.replace(/^ +/, "").replaceAll("\t", " ".repeat(4)))
        );
    }

    getGithubRegexp(toTheEnd, indent) {
        indent ||= 0;
        var regexpLine = "^ {0," + (indent + 3) + "}"
            + this.parsedToken.params.startingChar
            + "{" + this.parsedToken.params.startFence.length + ",}";
        if (toTheEnd)
            regexpLine += "$";
        return new RegExp(regexpLine);
    }

    handleStringEmphasis(tokenName, value) {
        if (!this.parsedToken.is(["em", "strong"])) {
            console.log("shouldn't get here");//TODO handle this error
            return;
        }
        var delimiter = this.parsedToken.params.del;
        if (tokenName === "string.strong")
            delimiter += delimiter;

        var length = delimiter.length;
        var shouldClose = false;

        var regexp = new RegExp("^\\" + this.parsedToken.params.del + "+$")
        if (regexp.test(value) && (!this.nextToken || (this.nextToken.type.name !== "constant.language.escape" && this.nextToken.value !== "["))) {
            var children = this.parsedToken.children;
            if (children.length > 0) {
                children.unshift(this.parsedToken.createTextToken(value));
            }

            this.removeCurrentToken();
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
            if (this.parsedToken.is("p") ||
                (this.parsedToken.is("list")
                    && (this.parsedToken.params.isOrdered !== params.isOrdered ||
                        this.parsedToken.params.del !== params.del)))
                this.closeToken();
        }

        if (this.parsedToken && this.parsedToken.is("list")) {
            if (this.parsedToken.params.isOrdered !== params.isOrdered ||
                this.parsedToken.params.del !== params.del
            )
                this.closeToken();
        }

        if (!this.parsedToken || !this.parsedToken.is("list"))
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
        return token && (token.is(["a", "img"]))
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
                if (tagName === "li" && this.parsedToken.is("list") && this.parsedToken.params.indent === type.indent) {
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
            } else if (value.startsWith("]")) {
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
                        if (this.parsedToken.is("p") && this.parsedToken.parentIs("li"))
                            return;
                        if ((this.parsedToken.is(tagName)) && (!type.indent || type.indent === this.parsedToken.params.indent))
                            return;
                        if (this.parsedToken.params.isRawHtml && this.currToken.type.name.endsWith(".xml"))
                            return;
                    }
                    break;
                case "p":
                    if (this.parsedToken && this.parsedToken.is(tagName))
                        return;
                    if (childTag === "header")
                        return;
                    break;
                case "blockquote":
                    var count = this.getBlockquoteCount(value);
                    var i = 1;
                    if (this.parsedToken) {
                        var blockquoteToken = this.parsedToken.getFirstParent(tagName);
                        if (blockquoteToken) {
                            if (blockquoteToken.from.row === row && this.parsedToken.is("li"))//TODO test all cases
                                count += blockquoteToken.params.level;
                            if (blockquoteToken.params.level >= count) {
                                return;
                            } else {
                                i = blockquoteToken.params.level;
                            }
                        } else if (this.parsedToken.is("p")) {
                            this.closeToken();
                        }

                        if (this.parsedToken && this.parsedToken.is("li")) {//TODO!!!!
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
                                    done = this.parsedToken.is(tagName);
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
                    if (this.parsedToken && this.parsedToken.is(tagName))
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
                } else if (!this.parsedToken) {
                    this.openToken("p");
                }
                params.name = type.name;
                switch (type.name) {
                    case "githubblock":
                        params.isFirstLine = true;
                        params.startingChar = value.trimStart()[0];
                        var regexp = new RegExp("^" + params.startingChar + "+");
                        params.indent = value.match(/^\s*/)[0].length;
                        if (this.parsedToken.parentIs("li"))
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
                if (this.parsedToken && this.parsedToken.is("p")
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
        this.parsedToken = new MarkdownToken(tagName, params, this.parsedToken);
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
            if (parentToken.is("p"))
                return;
        }

        if (this.parsedToken) {
            switch (this.parsedToken.tagName) {
                case "header":
                case "p":
                    if (this.parsedToken.is("p") && !this.parsedToken.children.length) {
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
                                if (lastChild.params.value.length === 0)
                                    this.parsedToken.children.pop();
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
            if (child.is("list")) {
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
        if (!this.isPreviousEmpty && this.parsedToken.getLastChild().is("p")) {
            this.parsedToken = this.parsedToken.children.pop();
            this.handleParagraph();
        }
    }

    removeCurrentToken() {
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

            if (lastChild.is("textNode")) {
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
        if (!this.parsedToken || !this.parsedToken.is("li"))
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
            if (this.parsedToken.is("blockquote"))
                this.blockquoteCount--;
            this.closeToken();
        }
    }

    calculateTableRowData() {
        var row = [];
        var cell = null;

        function addCellToRow() {
            var lastChild = cell[cell.length - 1];
            if (lastChild.is("textNode"))
                lastChild.params.value = lastChild.params.value.trimEnd();
            row.push(cell);
            cell = null;
        }

        this.parsedToken.children.forEach(child => {
            if (!child.is("textNode") || child.params.isEscaped) {
                cell ||= [];
                cell.push(child);
                return;
            }

            var range = child.range;
            var row = range.start.row;
            var startColumn, endColumn = range.start.column;

            child.params.value.split(/(\|)/).forEach(el => {
                startColumn = endColumn;
                endColumn += el.length;
                if (!cell)
                    el = el.trimStart();
                if (!row.length && !el.length)
                    return;
                if (el === "|") {
                    cell && addCellToRow();
                    return;
                }
                startColumn = endColumn - el.length;
                cell ||= [];
                if (el.length) {
                    var newTextToken = child.createTextToken(el);
                    newTextToken.range = Range.fromPoints({row, column: startColumn}, {row, column: endColumn});
                    cell.push(newTextToken);
                }
            })
        });
        cell && cell.length && addCellToRow();
        return row;
    }

    addRowDataTokens(row, isHeader) {
        var tagName = isHeader ? "th" : "td";

        this.openToken("tr");

        if (row.length < this.tableData.length)
            row.push(...Array(this.tableData.length - row.length));
        else if (row.length > this.tableData.length)
            row = row.slice(0, this.tableData.length);

        row.forEach((cell, i) => {
            this.openToken(tagName);
            if (this.tableData[i])
                this.parsedToken.addAttribute("align", this.tableData[i]);
            cell && cell.forEach((token) => {
                if (token.is("code"))
                    token.children.map(child => {
                        var escapeSymbols = /\\([\\!"#$%&'()*+,\-./:;<=>?@[\]^_`{|}~])/g;
                        child.params.value = child.params.value.replace(escapeSymbols, "$1");
                    });
                this.parsedToken.addChild(token);
            })
            this.closeToken();
        })
        this.closeToken();
    }

    tryOpenTableExtension() {
        if (this.isTableExtension)
            return;
        if (!/^[-: |]+$/.test(this.currLine) || !this.currLine.includes("-") ||
            (!this.currLine.includes(":") && !this.currLine.includes("|")))
            return;

        if (!this.parsedToken || !this.parsedToken.is("p"))
            return;

        var delimiterData = this.currLine.split("|").map(el => el.trim());
        if (delimiterData[0] === "")
            delimiterData.shift();

        if (delimiterData[delimiterData.length - 1] === "")
            delimiterData.pop();

        this.tableData = [];

        for (let i = 0; i < delimiterData.length; i++) {
          let delimiter = delimiterData[i];
          if (!/^:?-+:?$/.test(delimiter))
            return;
          var align = "";
          if (delimiter.startsWith(":")) {
              align = delimiter.endsWith(":") ? "center" : "left"
          } else if (delimiter.endsWith(":")) {
              align = "right";
          }
            this.tableData.push(align);
        }

        var tableHeader = this.calculateTableRowData();
        if (tableHeader.length !== this.tableData.length)
            return;

        this.removeCurrentToken();

        this.isTableExtension = true;
        this.openToken("table");
        this.openToken("thead");

        this.addRowDataTokens(tableHeader, true);

        this.closeToken();

        this.shouldIgnoreLine = true;
    }

    parseToken(name, value, isStartLine) {
        var addChildValue = (isEscaped) => {
            if (!value.length)
                return;
            if (!this.parsedToken) {
                console.log("Should not get here");
                return;
            }
            if (this.isLink(this.parsedToken) && !name.startsWith("constant"))
                return;
            this.parsedToken.addTextToken(value, isEscaped);
        }

        if (name.startsWith("markup.heading.")) {
            if (/^#+$/.test(value) && this.parsedToken.is("p")) //TODO hacked
                this.parsedToken.updateTagName("header");
            if (!this.parsedToken) {
                this.openToken("p");
                addChildValue();
            } else {
                this.parsedToken.params.heading = name.split(".")[2];
            }

            return;
        }
        if (name.startsWith("markup.list") && this.parsedToken.is("li")) {
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
        } else if (this.parsedToken && this.parsedToken.is("htmlBlock")) {
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
                    && this.isLink(this.parsedToken) && value.startsWith("]")) {
                    this.closeToken();
                    value = value.substring(1);
                }
                if (!this.parsedToken || !this.parsedToken.children.length || isStartLine) {
                    value = value.trimStart();
                    column = endColumn - value.length;
                }


                return addChildValue();
            case "support.function":
                if (!this.parsedToken) {
                    console.log("Error: empty parsedToken");
                    return;
                }
                var parent = this.parsedToken.parentToken;
                var indent = 4;
                while (parent) {
                    if (parent.is("blockquote")) {
                        value = value.replace(/^ /, "");
                        break;
                    } else if (parent.is("li")) {
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
                if (this.parsedToken.params.isUsingP && !this.parsedToken.is("p"))
                    this.openToken("p");
                if (this.parsedToken.is("li"))
                    this.handleParagraph();
                return addChildValue();
            case "string.emphasis":
            case "string.strong":
                return this.handleStringEmphasis(name, value);
            case "constant.language.escape":
                value = value.replace(/\\(.)/g, '$1');
                if (this.isLink(this.parsedToken) && this.currToken.type.parent.name.startsWith("string"))
                    return this.handleLinkTitle(value, true);
                return addChildValue(true);
            case "markup.underline":
                this.parsedToken.params.href = value;
                return;
            case "string":
                return this.handleLinkTitle(value);
            case "string.blockquote":
                value = this.removeBlockquote(value);
                if (!value.length) {
                    if (this.parsedToken.is("p"))
                        this.closeToken();
                    return;
                }
                if (!this.parsedToken) {
                    console.log("should not get here");
                    return;
                }
                if (!this.parsedToken.params.isRawHtml && !this.parsedToken.is("p"))
                    this.openToken("p");
                addChildValue();
                return;
            case "url":
                this.openToken("p");
                this.openToken("a");
                this.parsedToken.addTextToken(value);
                this.parsedToken.params.href = value;
                this.closeToken(2);
                return;
            case "support.variable":
                if (!this.parsedToken.is("li"))
                    return;

                var options = {};
                var isChecked = value === "[x]";
                if (isChecked)
                    options.checked = "";

                options.disabled = "";
                options.type = "checkbox";

                this.parsedToken.addToken("input", {options});
                return;
            case "url.underline":
                if (isMail(value) && this.nextToken && ["-", "_"].includes(this.nextToken.value)) {
                    this.parsedToken.addTextToken(value);
                    return;
                }
                var trailingParentheses = "";
                if (value.endsWith(")")) {
                    var openingParenthesesCount = (value.match(/\(/g) || []).length;
                    var closingParenthesesCount = value.match(/\)/g).length;



                    while (openingParenthesesCount < closingParenthesesCount && value.endsWith(")")) {
                        trailingParentheses += ")";
                        value = value.slice(0, -1);
                        closingParenthesesCount--;
                    }

                }

                this.openToken("a", {"href": value, isAutolink: true});

                this.parsedToken.addTextToken(value);
                this.closeToken();
                if (trailingParentheses.length)
                    this.parsedToken.addTextToken(trailingParentheses);
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

                if (listToken.is("list") && (diff === 0 || !listToken.parentToken))
                    //should create list item in current list
                    break;


                if (listToken.is("li") && diff === 0 && !markupType.startsWith("markup.list"))
                    //is continuation of this li
                    break;

                this.closeToken();

                if (diff > 0)
                    break;
            }
        }
        if (this.isPreviousEmpty)
            this.parsedToken.is("li") ? this.useParagraphForLi() : this.useParagraphForList(this.parsedToken);
    }

    handleNewLineForCodeBlock() {
        var requiredType = this.parsedToken.is("blockquote") ? "string.blockquote"
            : "support.function";
        if (this.firstTokenType === "empty" || this.firstTokenType === requiredType) {
            switch (this.parsedToken.params.name) {
                case "githubblock":
                    var listParent = this.parsedToken.getFirstParent("li");
                    var indent = listParent && listParent.params.indent;
                    var regExp = this.getGithubRegexp(true, indent);
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

        if (this.parsedToken.is(["p", "a", "img"])
            && this.parsedToken.parentIs("li")
            && this.getMarkupType() !== "list") {
            this.closeToken();
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

    shouldCloseTableExtension() {
        return this.currLine.length === 0 || this.getBlockquoteCount(this.currLine) > 0;
    }

    tryCloseTableExtension() {
        if (!this.isTableExtension || !this.shouldCloseTableExtension())
            return;

        this.closeToken(this.parsedToken.is("table") ? 1 : 2);
        this.isTableExtension = false;
    }

    handleTableExtension() {
        var row = this.calculateTableRowData();
        this.removeCurrentToken();
        if (!this.parsedToken.is("tbody"))
            this.openToken("tbody");

        this.addRowDataTokens(row);
    }

    shouldCloseCurrToken() {
        var currTokenType = this.currToken.type;
        var currTokenTypeName = currTokenType.name;
        if (!this.parsedToken)
            return false;
        if (this.parsedToken.params.isRawHtml) {
            return (currTokenTypeName === "empty" && !this.isHtml(this.currToken))
                || (this.parsedToken.is("htmlBlock") && currTokenTypeName.endsWith("tag-open.xml"));
        }
        switch (currTokenTypeName) {
            case "empty":
                return ["a", "img", "list", "header"].includes(this.parsedToken.tagName);
            case "paren.rpar":
                return this.isLink(this.parsedToken);
            case "string.emphasis":
                return (this.parsedToken.is("em")
                    && !["emphasisState", "barEmphasisState"].includes(currTokenType.parent.name));
            case "string.strong":
                return (this.parsedToken.is("strong")
                    && !["strongState", "barStrongState"].includes(currTokenType.parent.name));
            default:
                switch (this.parsedToken.tagName) {
                    case "code":
                        return (this.parsedToken.params.name === "codeSpan" && /^`+$/.test(this.currToken.value.trim()));
                    case "a":
                    case "img":
                        if (currTokenTypeName === "text") {
                            return (!this.currToken.value.startsWith("]") && !currTokenType.parent.name.startsWith("link")) || this.currToken.value === "[";
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
            column = 0;
            endColumn = 0;

            this.initLine(line);

            this.tryCloseList();
            this.tryCloseBlockquote();
            this.tryOpenTableExtension();

            this.tryCloseTableExtension();

            this.handleNewLine();

            this.isPreviousEmpty = this.isEmptyLine;

            if (this.shouldIgnoreLine)
                return;

            for (let j = 0; j < this.tokens.length; j++) {
                column = endColumn;
                if (this.currToken)
                    this.prevToken = this.currToken;
                this.currToken = this.tokens[j];
                this.nextToken = this.tokens[j + 1];

                var typeName = this.currToken.type.name;

                var value = this.currToken.value;
                endColumn = column + value.length;

                if (this.shouldCloseCurrToken()) {
                    var shouldContinue = !this.isLink(this.parsedToken);//TODO
                    this.closeToken();
                    if (shouldContinue)
                        continue;
                }
                if (typeName === "empty")
                    continue;

                this.buildTokenTree(this.currToken.type.parent, value);
                this.parseToken(typeName, value, j === 0);
            }

            if (this.isTableExtension)
                this.handleTableExtension();
        });
        this.closeToken(Infinity);

        return this.parsedTokens;
    }
}


exports.MarkdownParser = MarkdownParser;

