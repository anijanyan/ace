let src = "../../src/";
var parserSrc = "./markdown_parser";

if (typeof process == "undefined") {//TODO dirty hack
    src = "ace/";
    parserSrc = "markdown_parser";
}

const dom = require(src + "lib/dom");
var {MarkdownParser} = require(parserSrc);
class MarkdownRenderer {
    editor;
    resultHTML;
    parsedTokens;
    parsedString = "";

    entityRegexp;
    entityElement;
    markdownParser;

    constructor(resultHTML) {
        this.resultHTML = resultHTML;
        this.markdownParser = new MarkdownParser();
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
        this.editor.on("input", this.renderEditorValue);
        this.editor.selection.on("changeCursor", this.onSelect);
        this.editor.selection.on("changeSelection", this.onSelect);
    }

    onSelect = (e, selection) => {
        var selectionRanges = selection.inMultiSelectMode ? selection.ranges : [selection.getRange()];

        this.renderEditorValue();

        for (let i = 0; i < selectionRanges.length; i++) {
            this.trySelectToken(this.parsedTokens, selectionRanges[i]);
        }
    }

    trySelectToken(tokens, range) {
        for (let i = 0; i < tokens.length; i++) {
            var token = tokens[i];
            if (!token.range || !token.range.intersects(range))
                continue;

            if (token.children.length > 0) {
                this.trySelectToken(token.children, range);
            } else if (token.html) {
                this.selectToken(token);
            }
        }
    }

    selectToken(token) {
        const range = document.createRange();
        range.selectNodeContents(token.html);
        const mark = document.createElement("mark");
        mark.setAttribute("class", "ace-selected");
        range.surroundContents(mark);
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
            var params = {};
            switch (token.tagName) {
                case "newLine":
                    params = null;
                    arr = "\n";
                    break;
                case "textNode":
                    params = null;
                    arr = this.getEntityValue(token.params.value);
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
                        params["href"] = encodeURI(token.params.href);
                    } else {
                        params["src"] = token.params.href;
                        params["alt"] = token.children[0].params.value;
                        token.children = [];
                    }
                    params["title"] = token.params.title;

                    break;
                case "list":
                    if (token.params.isOrdered) {
                        arr[0] = "ol";
                            var start = Number(token.params.start);
                            if (start !== 1)
                                arr.push({"start": start.toString()});
                        } else {
                            arr[0] = "ul";
                        }
                        break;
                    case "header":
                        arr[0] = "h" + token.params.heading;
                        break;
                    case "code":
                        if (token.params.info)
                            arr.push({"class": "language-" + token.params.info});
                        break;
                    case "htmlBlock":
                        this.renderTokens(token.children, parentHtml);
                        continue;
                }
                if (token.params.isRawHtml)
                    params = token.attributes;
                params && arr.push(params);
                let html = dom.buildDom(arr, parentHtml);
                token.html = html;
                if (token.children && token.children.length)
                    this.renderTokens(token.children, html);
        }
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

