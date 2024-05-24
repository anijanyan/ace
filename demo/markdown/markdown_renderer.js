let src = "../../src/";
var parserSrc = "./markdown_parser";

if (typeof process == "undefined") {//TODO dirty hack
    src = "ace/";
    parserSrc = "markdown_parser";
}

const dom = require(src + "lib/dom");
var {MarkdownParser} = require(parserSrc);
const lang = require(src + "lib/lang");

class MarkdownRenderer {
    editor;
    resultHTML;
    markdownParser;

    parsedTokens;
    parsedString = "";

    entityRegexp;
    entityElement;

    changeTimer;
    rowToTokens = {};

    constructor() {
        this.markdownParser = new MarkdownParser();
        this.changeTimer = lang.delayedCall(this.renderEditorValue.bind(this), 0);
    }

    setEditor(editor) {
        this.editor = editor;

        this.editor.session.setMode("ace/mode/markdown");
        this.editor.on("change", this.changeTimer, true);
    }

    setResultHtml(resultHTML) {
        this.resultHTML = resultHTML;
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

            var renderToken = () => {
                if (token.isReference)
                    return;
                var calculateOptions = () => {
                    var tagName = token.tagName;
                    var options = token.options;

                    switch (token.tagName) {
                        case "newLine":
                            return "\n";
                        case "textNode":
                            return this.getEntityValue(token.params.value);
                        case "a":
                        case "img":
                            if (token.hasReference) {
                                const linkLabel = this.getLinkLabel(token);
                                var foundToken = this.parsedTokens.find((value) => value.isReference && this.getLinkLabel(value) === linkLabel);
                                if (foundToken) {
                                    token.params.href = foundToken.params.href;
                                    token.params.title = foundToken.params.title;
                                } else {
                                    token = token.children[0];
                                    token.params.value = "[" + token.params.value + "]";
                                    token.range.start.column--;
                                    token.range.end.column++;
                                    return this.getEntityValue(token.params.value);
                                }
                            }

                            var href = token.params.href || "";

                            if (token.is("a")) {
                                if (token.isMail()) {
                                    href = "mailto:" + href;
                                } else if (token.params.isAutolink && !href.startsWith("http")) {
                                    href = "http://" + href;
                                }
                                options["href"] = encodeURI(href);
                            } else {
                                options["src"] = href;
                                options["alt"] = token.children[0].params.value;
                                token.children = [];
                            }
                            options["title"] = token.params.title;

                            break;
                        case "list":
                            if (token.params.isOrdered) {
                                tagName = "ol";
                                var start = Number(token.params.start);
                                if (start !== 1)
                                    options["start"] = start.toString();
                            } else {
                                tagName = "ul";
                            }
                            break;
                        case "header":
                            tagName = "h" + token.params.heading;
                            break;
                        case "code":
                            if (token.params.info)
                                options["class"] = "language-" + token.params.info;
                            break;
                        case "htmlBlock":
                            return;
                    }
                    arr = [tagName];
                    if (token.params.isRawHtml)
                        options = token.attributes;
                    options && arr.push(options);
                    return arr;
                }
                var arr = calculateOptions();

                if (!arr || !arr.length)
                    return parentHtml;

                var html = dom.buildDom(arr, parentHtml);
                if (typeof html === "object")
                    html.$token = token;
                token.html = html;
                if (token.tagName === "textNode")
                    this.addToRowToToken(token);
                return html;
            }

            var html = renderToken();

             if (token.children.length)
                this.renderTokens(token.children, html);
        }
    }

    addToRowToToken (token) {
        var row = token.range.start.row;
        if (!this.rowToTokens[row])
            this.rowToTokens[row] = [];
        this.rowToTokens[row].push(token);
    }

    renderEditorValue = () => {
        this.render(this.editor.getValue());
    }

    render = (string) => {
        this.parse(string);

        this.resultHTML ||= dom.buildDom(["div"]);
        this.resultHTML.innerHTML = "";
        this.renderTokens(this.parsedTokens, this.resultHTML);
        return this.resultHTML.innerHTML;
    }
}

exports.MarkdownRenderer = MarkdownRenderer;