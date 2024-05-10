let src = "../../src/";
var parserSrc = "./markdown_parser";

if (typeof process == "undefined") {//TODO dirty hack
    src = "ace/";
    parserSrc = "markdown_parser";
}

const dom = require(src + "lib/dom");
var {MarkdownParser} = require(parserSrc);
const lang = require(src + "lib/lang");
const Range = require(src + "range").Range;

class MarkdownRenderer {
    editor;
    resultHTML;

    parsedTokens;
    parsedString = "";

    entityRegexp;
    entityElement;
    markdownParser;

    changeTimer;
    selectionTimer;
    scrollTimer;

    resultSelectionTimer;
    resultScrollTimer;

    rowToTokens = {};

    selectionRanges = [];
    editorScrollTopRow;
    nodeRanges = [];

    resultSelectionRange;
    resultScrollTop;

    scrollSetFrom= null;

    constructor(resultHTML) {
        this.resultHTML = resultHTML;
        this.markdownParser = new MarkdownParser();

        this.changeTimer = lang.delayedCall(this.renderEditorValue.bind(this), 0);
        this.selectionTimer = lang.delayedCall(this.onSelect.bind(this), 0);
        this.scrollTimer = lang.delayedCall(this.onScroll.bind(this), 0);

        this.resultSelectionTimer = lang.delayedCall(this.markdownResultSelect.bind(this), 0);
        this.resultScrollTimer = lang.delayedCall(this.markdownResultScroll.bind(this), 0);
    }

    setEditor(editor) {
        editor.session.setMode("ace/mode/markdown");

        this.editor = editor;
        this.$attachEventHandlers();
    }

    setResultHtml(resultHTML) {
        this.resultHTML = resultHTML;
    }

    $attachEventHandlers() {
        this.editor.on("change", this.changeTimer, true);
        this.editor.selection.on("changeSelection", this.selectionTimer);
        this.editor.session.on("changeScrollTop", this.scrollTimer.bind(null, null));

        document.addEventListener("selectionchange", this.resultSelectionTimer);
        this.resultHTML.addEventListener("scroll", this.resultScrollTimer);
    }

    markdownResultSelect = () => {
        var selection = window.getSelection();

        let range  = selection.getRangeAt(0);
        if (this.resultSelectionRange &&
            this.resultSelectionRange.startContainer === range.startContainer &&
            this.resultSelectionRange.startOffset === range.startOffset &&
            this.resultSelectionRange.endContainer === range.endContainer &&
            this.resultSelectionRange.endOffset === range.endOffset) {
            return;
        }

        this.resultSelectionRange = range;

        var startToken = range.startContainer.$token;
        var endToken = range.endContainer.$token;
        if (!startToken || !endToken)
            return;

        var startOffset = range.startOffset;
        var endOffset = range.endOffset;

        var start = {...startToken.from};
        start.column += startOffset;
        var end = {...endToken.from};
        end.column += endOffset;

        var aceRange = Range.fromPoints(start, end);
        this.editor.session.selection.setSelectionRange(aceRange);
    }

    markdownResultScroll = () => {
        if (this.scrollSetFrom === "editor") {
            this.scrollSetFrom = null;
            return;
        }

        this.scrollSetFrom = "result";

        if (this.resultHTML.scrollTop === this.resultScrollTop)
            return;

        this.resultScrollTop = this.resultHTML.scrollTop;

        const firstChild = Array.from(this.resultHTML.children).find((child) => child.offsetTop - this.resultScrollTop >= 0);
        this.editor.renderer.scrollToRow(firstChild.$token.from.row);
    }

    onScroll = () => {
        if (this.scrollSetFrom === "result") {
            this.scrollSetFrom = null;
            return;
        }
        this.scrollSetFrom = "editor";

        var row = Math.floor(this.editor.renderer.getScrollTopRow());
        this.scrollIntoToken(this.parsedTokens, row)
    }

    clearScrolled() {
        const scrolledElement = document.getElementById("ace-scrolled-to");
        if (!scrolledElement)
            return;
        scrolledElement.parentNode.removeChild(scrolledElement);
    }

    scrollIntoToken(tokens, row) {
        row = this.getNextValidRow(row);
        if (this.editorScrollTopRow === row)
            return;

        this.editorScrollTopRow = row;

        this.clearScrolled();

        if (!Object.keys(this.rowToTokens).length)
            return;

        var token = this.rowToTokens[row][0];
        var scrolledTo = document.createElement("div");
        scrolledTo.setAttribute("id", "ace-scrolled-to");
        token.html.parentNode.insertBefore(scrolledTo, token.html);
        return scrolledTo.scrollIntoView({behavior: "auto"});
    }

    getNextValidRow(row) {
        var length = this.editor.session.getLength()

        while (!this.rowToTokens.hasOwnProperty(row) && row < length) {
            row++;
        }

        if (!this.rowToTokens.hasOwnProperty(row))
            row = Object.keys(this.rowToTokens).pop();

        return row;
    }

    onSelect = () => {
        var selectionRanges = this.editor.selection.getAllRanges();

        if (this.selectionRanges.toString() === selectionRanges.toString())
            return;
        this.selectionRanges = selectionRanges;

        this.calculateNodeRanges();
        this.highlightSelectedTokens();
    }

    calculateNodeRanges() {
        this.nodeRanges = [];
        if (Object.keys(this.rowToTokens).length > 0)
            this.selectionRanges.forEach((selectionRange) => this.calculateNodeRange(selectionRange));
        return this.nodeRanges;
    }

    calculateNodeRange(selectionRange) {
        if (selectionRange.isEmpty())
            return;

        var start = selectionRange.start;
        var end = selectionRange.end;

        var startRow = this.getNextValidRow(start.row);
        var endRow = this.getNextValidRow(end.row);

        var startToken, endToken;
        var startColumn, endColumn;

        var startTokens = this.rowToTokens[startRow];
        if (startRow !== start.row) {
            startToken = startTokens[0];
            startColumn = 0;
        } else {
            startToken = startTokens.find((token) => selectionRange.contains(startRow, token.from.column) || token.range.insideStart(startRow, start.column));
            if (!startToken) {
                startToken = [...startTokens].pop();
                startColumn = startToken.html.length;
            } else {
                startColumn = Math.max(start.column - startToken.from.column, 0);
            }
        }

        var endTokens = this.rowToTokens[endRow];
        if (endRow !== end.row) {
            endToken = endTokens[0];
            endColumn = 0;
        } else {
            endToken = endTokens.findLast((token) => token.range.intersects(selectionRange));
            endToken ||= endTokens[0];
            endColumn = Math.max(end.column - endToken.from.column, 0);
            endColumn = Math.min(endColumn, endToken.html.length);
        }

        var range = document.createRange();
        range.setStart(startToken.html, startColumn);
        range.setEnd(endToken.html, endColumn);

        if (!range.collapsed)
            this.nodeRanges.push(range);
    }


    highlightSelectedTokens() {
        if (!CSS.highlights) {
            console.log("CSS Custom Highlight API not supported");
            return;
        }
        CSS.highlights.clear();

        const highlight = new Highlight(...this.nodeRanges);
        CSS.highlights.set("markdown-select", highlight);
    }

    getLinkLabel(token) {
        return JSON.stringify(token.children.map(child => {
            if (child.tagName === "textNode") {
                return child.params.value.toLowerCase();
            } else if (child.tagName === "newLine") {
                return "\n";
            } else {
                return "";
            }
        }));//TODO
        // circular
    }

    getEntityValue = (value) => {
        this.entityRegexp ||= /&(\w+|#[0-9]+);/g;
        if (!this.entityRegexp.test(value))
            return value;
        var parts = value.match(this.entityRegexp);
        parts.forEach((part) => {
            this.entityElement ||= document.createElement("textarea");
            this.entityElement.innerHTML = part;
            if (this.entityElement.innerHTML)
                value = value.replace(part, this.entityElement.innerHTML);
        });
        return value;
    }

    parse(string) {
        if (string === this.parsedString)
            return;
        this.rowToTokens = {};
        this.parsedTokens = this.markdownParser.parse(string);
        this.parsedString = string;
    }

    renderTokens = (tokens, parentHtml) => {
        let l = tokens.length;
        for (let i = 0; i < l; i++) {
            let token = tokens[i];
            if (token.isReference)
                continue;

            let arr = [token.tagName];
            var options = token.options;
            switch (token.tagName) {
                case "newLine":
                    options = null;
                    arr = "\n";
                    break;
                case "textNode":
                    options = null;
                    arr = this.getEntityValue(token.params.value);
                    if (arr.length === 0)
                        continue;
                    break;
                case "a":
                case "img":
                    if (token.hasReference) {
                        const linkLabel = this.getLinkLabel(token);
                        var foundToken = this.parsedTokens.find((value) => value.isReference && this.getLinkLabel(value) === linkLabel);
                        if (foundToken) {
                            token.params.href = foundToken.params.href;
                            token.params.title = foundToken.params.title;
                        } else {
                            dom.buildDom("[" + token.children[0].params.value + "]", parentHtml);
                            continue;
                        }
                    }

                    token.params.href ||= "";

                    if (token.tagName === "a") {
                        options["href"] = encodeURI(token.params.href);
                    } else {
                        options["src"] = token.params.href;
                        options["alt"] = token.children[0].params.value;
                        token.children = [];
                    }
                    options["title"] = token.params.title;

                    break;
                case "list":
                    if (token.params.isOrdered) {
                        arr[0] = "ol";
                        var start = Number(token.params.start);
                        if (start !== 1)
                            options["start"] = start.toString();
                    } else {
                        arr[0] = "ul";
                    }
                    break;
                case "header":
                    arr[0] = "h" + token.params.heading;
                    break;
                case "code":
                    if (token.params.info)
                        options["class"] = "language-" + token.params.info;
                    break;
                case "htmlBlock":
                    this.renderTokens(token.children, parentHtml);
                    continue;
            }
            if (token.params.isRawHtml)
                options = token.attributes;
            options && arr.push(options);
            let html = dom.buildDom(arr, parentHtml);

            if (typeof html === "object")
                html.$token = token;
            token.html = html;
            if (token.children.length) {
                this.renderTokens(token.children, html);
            } else if (token.tagName === "textNode") {
                this.addToRowToToken(token);
            }
        }
    }

    addToRowToToken (token) {
        var row = token.from.row;
        if (!this.rowToTokens[row])
            this.rowToTokens[row] = [];
        this.rowToTokens[row].push(token);
    }

    renderEditorValue = () => {
        this.render(this.editor.getValue());
    }

    render = (string) => {
        this.parse(string);

        this.resultHTML.innerHTML = "";
        this.renderTokens(this.parsedTokens, this.resultHTML);
    }
}

exports.MarkdownRenderer = MarkdownRenderer;

