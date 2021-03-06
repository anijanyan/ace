/* This file was autogenerated from turtle.tmLanguage (uuid: ) */
/****************************************************************************************
 * IT MIGHT NOT BE PERFECT ...But it's a good start from an existing *.tmlanguage file. *
 * fileTypes                                                                            *
 ****************************************************************************************/

"use strict";

var oop = require("../lib/oop");
var TextHighlightRules = require("./text_highlight_rules").TextHighlightRules;

var TurtleHighlightRules = function() {
    // regexp must not have capturing parentheses. Use (?:) instead.
    // regexps are ordered -> the first match is used

    this.$rules = {
        start: [{
            include: "#comments"
        }, {
            include: "#strings"
        }, {
            include: "#base-prefix-declarations"
        }, {
            include: "#string-language-suffixes"
        }, {
            include: "#string-datatype-suffixes"
        }, {
            include: "#relative-urls"
        }, {
            include: "#xml-schema-types"
        }, {
            include: "#rdf-schema-types"
        }, {
            include: "#owl-types"
        }, {
            include: "#qnames"
        }, {
            include: "#punctuation-operators"
        }],
        "#base-prefix-declarations": [{
            token: "keyword.other.prefix.turtle",
            regex: /@(?:base|prefix)/
        }],
        "#comments": [{
            token: [
                "punctuation.definition.comment.turtle",
                "comment.line.hash.turtle"
            ],
            regex: /(#)(.*$)/
        }],
        "#owl-types": [{
            token: "support.type.datatype.owl.turtle",
            regex: /owl:[a-zA-Z]+/
        }],
        "#punctuation-operators": [{
            token: "keyword.operator.punctuation.turtle",
            regex: /;|,|\.|\(|\)|\[|\]/
        }],
        "#qnames": [{
            token: "entity.name.other.qname.turtle",
            regex: /(?:[a-zA-Z][-_a-zA-Z0-9]*)?:(?:[_a-zA-Z][-_a-zA-Z0-9]*)?/
        }],
        "#rdf-schema-types": [{
            token: "support.type.datatype.rdf.schema.turtle",
            regex: /rdfs?:[a-zA-Z]+|(?:^|\s)a(?:\s|$)/
        }],
        "#relative-urls": [{
            token: "string.quoted.other.relative.url.turtle",
            regex: /</,
            push: [{
                token: "string.quoted.other.relative.url.turtle",
                regex: />/,
                next: "pop"
            }, {
                defaultToken: "string.quoted.other.relative.url.turtle"
            }]
        }],
        "#string-datatype-suffixes": [{
            token: "keyword.operator.datatype.suffix.turtle",
            regex: /\^\^/
        }],
        "#string-language-suffixes": [{
            token: [
                "keyword.operator.language.suffix.turtle",
                "constant.language.suffix.turtle"
            ],
            regex: /(?!")(@)([a-z]+(?:\-[a-z0-9]+)*)/
        }],
        "#strings": [{
            token: "string.quoted.triple.turtle",
            regex: /"""/,
            push: [{
                token: "string.quoted.triple.turtle",
                regex: /"""/,
                next: "pop"
            }, {
                defaultToken: "string.quoted.triple.turtle"
            }]
        }, {
            token: "string.quoted.double.turtle",
            regex: /"/,
            push: [{
                token: "string.quoted.double.turtle",
                regex: /"/,
                next: "pop"
            }, {
                token: "invalid.string.newline",
                regex: /$/
            }, {
                token: "constant.character.escape.turtle",
                regex: /\\./
            }, {
                defaultToken: "string.quoted.double.turtle"
            }]
        }],
        "#xml-schema-types": [{
            token: "support.type.datatype.xml.schema.turtle",
            regex: /xsd?:[a-z][a-zA-Z]+/
        }]
    };
    
    this.normalizeRules();
};

TurtleHighlightRules.metaData = {
    fileTypes: ["ttl", "nt"],
    name: "Turtle",
    scopeName: "source.turtle"
};


oop.inherits(TurtleHighlightRules, TextHighlightRules);

exports.TurtleHighlightRules = TurtleHighlightRules;
