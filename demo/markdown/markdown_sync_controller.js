var src = "ace/";

const lang = require(src + "lib/lang");
const Range = require(src + "range").Range;

class MarkdownSyncController {
    markdownRenderer;

    selectionTimer;
    scrollTimer;

    resultSelectionTimer;
    resultScrollTimer;

    selectionRanges = [];
    editorScrollTopRow;
    nodeRanges = [];

    resultSelectionRange;
    resultScrollTop;

    scrollSetFrom = null;
    selectSetFrom = null;

    constructor() {
        this.selectionTimer = lang.delayedCall(this.onSelect.bind(this), 0);
        this.scrollTimer = lang.delayedCall(this.onScroll.bind(this), 0);

        this.resultSelectionTimer = lang.delayedCall(this.markdownResultSelect.bind(this), 0);
        this.resultScrollTimer = lang.delayedCall(this.markdownResultScroll.bind(this), 0);
    }

    init(markdownRenderer) {
        this.markdownRenderer = markdownRenderer;
        this.setEditor();
        this.setResultHtml();
    }


    setEditor() {
        this.markdownRenderer.editor.selection.on("changeSelection", this.selectionTimer);
        this.markdownRenderer.editor.session.on("changeScrollTop", this.scrollTimer.bind(null, null));
    }

    setResultHtml() {
        document.addEventListener("selectionchange", this.resultSelectionTimer);
        this.markdownRenderer.resultHTML.addEventListener("scroll", this.resultScrollTimer);
    }

    isNodeInResultHtml = (node) => {
        let currentNode = node;
        while (currentNode) {
            if (currentNode === this.markdownRenderer.resultHTML)
                return true;
            currentNode = currentNode.parentNode;
        }
        return false;
    }

    markdownResultSelect = (e) => {
        if (this.selectSetFrom === "editor") {
            this.selectSetFrom = null;
            return;
        }

        this.selectSetFrom = "result";
        this.clearHighlights();

        var selection = window.getSelection();

        if (selection.type === "None") {
            this.markdownRenderer.editor.clearSelection();
            return;
        }

        var range  = selection.getRangeAt(0);

        if (!this.isNodeInResultHtml(range.startContainer)) {
            if (this.isNodeInResultHtml(range.endContainer)) {
                range.setStart(this.markdownRenderer.resultHTML.firstChild, 0);
                selection.addRange(range);
            }

            return;
        }


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

        var start = {...startToken.range.start};
        start.column += startOffset;
        var end = {...endToken.range.start};
        end.column += endOffset;

        var aceRange = Range.fromPoints(start, end);
        this.markdownRenderer.editor.session.selection.setSelectionRange(aceRange);
    }


    markdownResultScroll = () => {
        if (this.scrollSetFrom === "editor") {
            this.scrollSetFrom = null;
            return;
        }

        this.scrollSetFrom = "result";

        if (this.markdownRenderer.resultHTML.scrollTop === this.resultScrollTop)
            return;

        this.resultScrollTop = this.markdownRenderer.resultHTML.scrollTop;

        const firstChild = Array.from(this.markdownRenderer.resultHTML.children).find((child) => child.offsetTop - this.resultScrollTop >= 0);
        this.markdownRenderer.editor.renderer.scrollToRow(firstChild.$token.range.start.row);
    }

    onScroll = () => {
        if (this.scrollSetFrom === "result") {
            this.scrollSetFrom = null;
            return;
        }
        this.scrollSetFrom = "editor";

        var row = Math.floor(this.markdownRenderer.editor.renderer.getScrollTopRow());
        this.scrollIntoToken(this.markdownRenderer.parsedTokens, row)
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

        if (!Object.keys(this.markdownRenderer.rowToTokens).length)
            return;

        var token = this.markdownRenderer.rowToTokens[row][0];
        var scrolledTo = document.createElement("div");
        scrolledTo.setAttribute("id", "ace-scrolled-to");
        token.html.parentNode.insertBefore(scrolledTo, token.html);
        return scrolledTo.scrollIntoView({behavior: "auto"});
    }

    getNextValidRow(row) {
        var length = this.markdownRenderer.editor.session.getLength()

        while (!this.markdownRenderer.rowToTokens.hasOwnProperty(row) && row < length) {
            row++;
        }

        if (!this.markdownRenderer.rowToTokens.hasOwnProperty(row))
            row = Object.keys(this.markdownRenderer.rowToTokens).pop();

        return row;
    }

    onSelect = () => {
        if (this.selectSetFrom === "result") {
            this.selectSetFrom = null;
            return;
        }
        this.selectSetFrom = "editor";
        var selectionRanges = this.markdownRenderer.editor.selection.getAllRanges();

        if (this.selectionRanges.toString() === selectionRanges.toString())
            return;
        this.selectionRanges = selectionRanges;

        this.calculateNodeRanges();
        this.highlightSelectedTokens();
    }

    calculateNodeRanges() {
        this.nodeRanges = [];
        if (Object.keys(this.markdownRenderer.rowToTokens).length > 0)
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

        var startTokens = this.markdownRenderer.rowToTokens[startRow];
        if (startRow !== start.row) {
            startToken = startTokens[0];
            startColumn = 0;
        } else {
            startToken = startTokens.find((token) => selectionRange.contains(startRow, token.range.start.column)
                || token.range.insideStart(startRow, start.column));
            if (!startToken) {
                startToken = [...startTokens].pop();
                startColumn = startToken.html.length;
            } else {
                startColumn = Math.max(start.column - startToken.range.start.column, 0);
                startColumn = Math.min(startColumn, startToken.html.length);
            }
        }

        var endTokens = this.markdownRenderer.rowToTokens[endRow];
        if (endRow !== end.row) {
            if (endRow > end.row) {
                endToken = endTokens[0];
                endColumn = 0;
            } else {
                endToken = endTokens[endTokens.length - 1];
                endColumn = endToken.html.length;
            }
        } else {
            endToken = endTokens.findLast((token) => token.range.intersects(selectionRange));
            endToken ||= endTokens[0];
            endColumn = Math.max(end.column - endToken.range.start.column, 0);
            endColumn = Math.min(endColumn, endToken.html.length);
        }

        var range = document.createRange();
        range.setStart(startToken.html, startColumn);
        range.setEnd(endToken.html, endColumn);

        if (!range.collapsed)
            this.nodeRanges.push(range);
    }

    clearHighlights() {
        if (!CSS.highlights) {
            console.log("CSS Custom Highlight API not supported");
            return;
        }
        CSS.highlights.clear();
    }

    highlightSelectedTokens() {
        if (!CSS.highlights) {
            console.log("CSS Custom Highlight API not supported");
            return;
        }
        this.clearHighlights();

        const highlight = new Highlight(...this.nodeRanges);
        CSS.highlights.set("markdown-select", highlight);
    }
}

exports.MarkdownSyncController = MarkdownSyncController;