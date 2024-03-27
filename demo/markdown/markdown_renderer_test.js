let src = "../../src/";

if (typeof process !== "undefined") {
    require("amd-loader");
    require(src + "/test/mockdom");
}

"use strict";

var dom = require(src + "/lib/dom");
var assert = require(src + "/test/assertions");
var MarkdownRenderer = require("./markdown_renderer").MarkdownRenderer;

var commonmarkJson = {
    "1": {
        "markdown": "\tfoo\tbaz\t\tbim",
        "html": "<pre><code>foo\tbaz\t\tbim</code></pre>"
    },
    "2": {
        "markdown": "  \tfoo\tbaz\t\tbim",
        "html": "<pre><code>foo\tbaz\t\tbim</code></pre>"
    },
    "3": {
        "markdown": "    a\ta\n    ὐ\ta",
        "html": "<pre><code>a\ta\nὐ\ta</code></pre>"
    },
    "4": {
        "markdown": "  - foo\n\n\tbar",
        "html": "<ul><li><p>foo</p><p>bar</p></li></ul>"
    },
    "5": {
        "markdown": "- foo\n\n\t\tbar",
        "html": "<ul><li><p>foo</p><pre><code>  bar</code></pre></li></ul>"
    },
    "6": {
        "markdown": ">\t\tfoo",
        "html": "<blockquote><pre><code>  foo</code></pre></blockquote>"
    },
    // "7": {//TODO support function in listblock
    //     "markdown": "-\t\tfoo",
    //     "html": "<ul><li><pre><code>  foo</code></pre></li></ul>"
    // },
    "8": {
        "markdown": "    foo\n\tbar",
        "html": "<pre><code>foo\nbar</code></pre>"
    },
    "9": {
        "markdown": " - foo\n   - bar\n\t - baz",
        "html": "<ul><li>foo<ul><li>bar<ul><li>baz</li></ul></li></ul></li></ul>"
    },
    "10": {
        "markdown": "#\tFoo",
        "html": "<h1>Foo</h1>"
    },
    "11": {
        "markdown": "*\t*\t*\t",
        "html": "<hr />"
    },
    // "12": {//TODO wrong token, block precedence is not considered
    //     "markdown": "- `one\n- two`",
    //     "html": "<ul><li>`one</li><li>two`</li></ul>"
    // },
    "13": {
        "markdown": "***\n---\n___",
        "html": "<hr /><hr /><hr />"
    },
    "14": {
        "markdown": "+++",
        "html": "<p>+++</p>"
    },
    "15": {
        "markdown": "===",
        "html": "<p>===</p>"
    },
    "16": {
        "markdown": "--\n**\n__",
        "html": "<p>--\n**\n__</p>"
    },
    "17": {
        "markdown": " ***\n  ***\n   ***",
        "html": "<hr /><hr /><hr />"
    },
    "18": {
        "markdown": "    ***",
        "html": "<pre><code>***</code></pre>"
    },
    "19": {
        "markdown": "Foo\n    ***",
        "html": "<p>Foo\n***</p>"
    },
    "20": {
        "markdown": "_____________________________________",
        "html": "<hr />"
    },
    "21": {
        "markdown": " - - -",
        "html": "<hr />"
    },
    "22": {
        "markdown": " **  * ** * ** * **",
        "html": "<hr />"
    },
    "23": {
        "markdown": "-     -      -      -",
        "html": "<hr />"
    },
    "24": {
        "markdown": "- - - -    ",
        "html": "<hr />"
    },
    "25": {
        "markdown": "_ _ _ _ a\n\na------\n\n---a---",
        "html": "<p>_ _ _ _ a</p><p>a------</p><p>---a---</p>"
    },
    "26": {
        "markdown": " *-*",
        "html": "<p><em>-</em></p>"
    },
    "27": {
        "markdown": "- foo\n***\n- bar",
        "html": "<ul><li>foo</li></ul><hr /><ul><li>bar</li></ul>"
    },
    "28": {
        "markdown": "Foo\n***\nbar",
        "html": "<p>Foo</p><hr /><p>bar</p>"
    },
    "29": {
        "markdown": "Foo\n---\nbar",
        "html": "<h2>Foo</h2><p>bar</p>"
    },
    "30": {
        "markdown": "* Foo\n* * *\n* Bar",
        "html": "<ul><li>Foo</li></ul><hr /><ul><li>Bar</li></ul>"
    },
    // "31": {//TODO thematic break doesn't have listblock as parent
    //     "markdown": "- Foo\n- * * *",
    //     "html": "<ul><li>Foo</li><li><hr /></li></ul>"
    // },
    "32": {
        "markdown": "# foo\n## foo\n### foo\n#### foo\n##### foo\n###### foo",
        "html": "<h1>foo</h1><h2>foo</h2><h3>foo</h3><h4>foo</h4><h5>foo</h5><h6>foo</h6>"
    },
    "33": {
        "markdown": "####### foo",
        "html": "<p>####### foo</p>"
    },
    "34": {
        "markdown": "#5 bolt\n\n#hashtag",
        "html": "<p>#5 bolt</p><p>#hashtag</p>"
    },
    "35": {
        "markdown": "\\## foo",
        "html": "<p>## foo</p>"
    },
    "36": {
        "markdown": "# foo *bar* \\*baz\\*",
        "html": "<h1>foo <em>bar</em> *baz*</h1>"
    },
    "37": {
        "markdown": "#                  foo                     ",
        "html": "<h1>foo</h1>"
    },
    "38": {
        "markdown": " ### foo\n  ## foo\n   # foo",
        "html": "<h3>foo</h3><h2>foo</h2><h1>foo</h1>"
    },
    "39": {
        "markdown": "    # foo",
        "html": "<pre><code># foo</code></pre>"
    },
    "40": {
        "markdown": "foo\n    # bar",
        "html": "<p>foo\n# bar</p>"
    },
    "41": {
        "markdown": "## foo ##\n  ###   bar    ###",
        "html": "<h2>foo</h2><h3>bar</h3>"
    },
    "42": {
        "markdown": "# foo ##################################\n##### foo ##",
        "html": "<h1>foo</h1><h5>foo</h5>"
    },
    "43": {
        "markdown": "### foo ###     ",
        "html": "<h3>foo</h3>"
    },
    "44": {
        "markdown": "### foo ### b",
        "html": "<h3>foo ### b</h3>"
    },
    "45": {
        "markdown": "# foo#",
        "html": "<h1>foo#</h1>"
    },
    "46": {
        "markdown": "### foo \\###\n## foo #\\##\n# foo \\#",
        "html": "<h3>foo ###</h3><h2>foo ###</h2><h1>foo #</h1>"
    },
    "47": {
        "markdown": "****\n## foo\n****",
        "html": "<hr /><h2>foo</h2><hr />"
    },
    "48": {
        "markdown": "Foo bar\n# baz\nBar foo",
        "html": "<p>Foo bar</p><h1>baz</h1><p>Bar foo</p>"
    },
    "49": {
        "markdown": "## \n#\n### ###",
        "html": "<h2></h2><h1></h1><h3></h3>"
    },
    "50": {
        "markdown": "Foo *bar*\n=========\n\nFoo *bar*\n---------",
        "html": "<h1>Foo <em>bar</em></h1><h2>Foo <em>bar</em></h2>"
    },
    "51": {
        "markdown": "Foo *bar\nbaz*\n====",
        "html": "<h1>Foo <em>bar\nbaz</em></h1>"
    },
    "52": {
        "markdown": "  Foo *bar\nbaz*\t\n====",
        "html": "<h1>Foo <em>bar\nbaz</em></h1>"
    },
    "53": {
        "markdown": "Foo\n-------------------------\n\nFoo\n=",
        "html": "<h2>Foo</h2><h1>Foo</h1>"
    },
    "54": {
        "markdown": "   Foo\n---\n\n  Foo\n-----\n\n  Foo\n  ===",
        "html": "<h2>Foo</h2><h2>Foo</h2><h1>Foo</h1>"
    },
    "55": {
        "markdown": "    Foo\n    ---\n\n    Foo\n---",
        "html": "<pre><code>Foo\n---\n\nFoo</code></pre><hr />"
    },
    "56": {
        "markdown": "Foo\n   ----      ",
        "html": "<h2>Foo</h2>"
    },
    "57": {
        "markdown": "Foo\n    ---",
        "html": "<p>Foo\n---</p>"
    },
    "58": {
        "markdown": "Foo\n= =\n\nFoo\n--- -",
        "html": "<p>Foo\n= =</p><p>Foo</p><hr />"
    },
    "59": {
        "markdown": "Foo  \n-----",
        "html": "<h2>Foo</h2>"
    },
    "60": {
        "markdown": "Foo\\\n----",
        "html": "<h2>Foo\\</h2>"
    },
    // "61": {//TODO block precedence
    //     "markdown": "`Foo\n----\n`\n<a title=\"a lot\n---\nof dashes\"/>",
    //     "html": "<h2>`Foo</h2><p>`</p><h2>&lt;a title=&quot;a lot</h2><p>of dashes&quot;/&gt;</p>"
    // },
    "62": {
        "markdown": "> Foo\n---",
        "html": "<blockquote><p>Foo</p></blockquote><hr />"
    },
    "63": {
        "markdown": "> foo\nbar\n===",
        "html": "<blockquote><p>foo\nbar\n===</p></blockquote>"
    },
    "64": {
        "markdown": "- Foo\n---",
        "html": "<ul><li>Foo</li></ul><hr />"
    },
    "65": {
        "markdown": "Foo\nBar\n---",
        "html": "<h2>Foo\nBar</h2>"
    },
    "66": {
        "markdown": "---\nFoo\n---\nBar\n---\nBaz",
        "html": "<hr /><h2>Foo</h2><h2>Bar</h2><p>Baz</p>"
    },
    "67": {
        "markdown": "\n====",
        "html": "<p>====</p>"
    },
    "68": {
        "markdown": "---\n---",
        "html": "<hr /><hr />"
    },
    "69": {
        "markdown": "- foo\n-----",
        "html": "<ul><li>foo</li></ul><hr />"
    },
    "70": {
        "markdown": "    foo\n---",
        "html": "<pre><code>foo</code></pre><hr />"
    },
    "71": {
        "markdown": "> foo\n-----",
        "html": "<blockquote><p>foo</p></blockquote><hr />"
    },
    "72": {
        "markdown": "\\> foo\n------",
        "html": "<h2>&gt; foo</h2>"
    },
    "73": {
        "markdown": "Foo\n\nbar\n---\nbaz",
        "html": "<p>Foo</p><h2>bar</h2><p>baz</p>"
    },
    "74": {
        "markdown": "Foo\nbar\n\n---\n\nbaz",
        "html": "<p>Foo\nbar</p><hr /><p>baz</p>"
    },
    "75": {
        "markdown": "Foo\nbar\n* * *\nbaz",
        "html": "<p>Foo\nbar</p><hr /><p>baz</p>"
    },
    "76": {
        "markdown": "Foo\nbar\n\\---\nbaz",
        "html": "<p>Foo\nbar\n---\nbaz</p>"
    },
    "77": {
        "markdown": "    a simple\n      indented code block",
        "html": "<pre><code>a simple\n  indented code block</code></pre>"
    },
    "78": {
        "markdown": "  - foo\n\n    bar",
        "html": "<ul><li><p>foo</p><p>bar</p></li></ul>"
    },
    "79": {
        "markdown": "1.  foo\n\n    - bar",
        "html": "<ol><li><p>foo</p><ul><li>bar</li></ul></li></ol>"
    },
    "80": {
        "markdown": "    <a/>\n    *hi*\n\n    - one",
        "html": "<pre><code>&lt;a/&gt;\n*hi*\n\n- one</code></pre>"
    },
    "81": {
        "markdown": "    chunk1\n\n    chunk2\n  \n \n \n    chunk3",
        "html": "<pre><code>chunk1\n\nchunk2\n\n\n\nchunk3</code></pre>"
    },
    "82": {
        "markdown": "    chunk1\n      \n      chunk2",
        "html": "<pre><code>chunk1\n  \n  chunk2</code></pre>"
    },
    "83": {
        "markdown": "Foo\n    bar",
        "html": "<p>Foo\nbar</p>"
    },
    "84": {
        "markdown": "    foo\nbar",
        "html": "<pre><code>foo</code></pre><p>bar</p>"
    },
    "85": {
        "markdown": "# Heading\n    foo\nHeading\n------\n    foo\n----",
        "html": "<h1>Heading</h1><pre><code>foo</code></pre><h2>Heading</h2><pre><code>foo</code></pre><hr />"
    },
    "86": {
        "markdown": "        foo\n    bar",
        "html": "<pre><code>    foo\nbar</code></pre>"
    },
    "87": {
        "markdown": "\n    \n    foo\n    ",
        "html": "<pre><code>foo</code></pre>"
    },
    "88": {
        "markdown": "    foo  ",
        "html": "<pre><code>foo  </code></pre>"
    },
    "89": {
        "markdown": "```\n<\n >\n```",
        "html": "<pre><code>&lt;\n &gt;</code></pre>"
    },
    "90": {
        "markdown": "~~~\n<\n >\n~~~",
        "html": "<pre><code>&lt;\n &gt;</code></pre>"
    },
    "91": {
        "markdown": "``\nfoo\n``",
        "html": "<p><code>foo</code></p>"
    },
    "92": {
        "markdown": "```\naaa\n~~~\n```",
        "html": "<pre><code>aaa\n~~~</code></pre>"
    },
    "93": {
        "markdown": "~~~\naaa\n```\n~~~",
        "html": "<pre><code>aaa\n```</code></pre>"
    },
    "94": {
        "markdown": "````\naaa\n```\n``````",
        "html": "<pre><code>aaa\n```</code></pre>"
    },
    "95": {
        "markdown": "~~~~\naaa\n~~~\n~~~~",
        "html": "<pre><code>aaa\n~~~</code></pre>"
    },
    "96": {
        "markdown": "```",
        "html": "<pre><code></code></pre>"
    },
    // "97": {//TODO The closing code fence must be at least as long as the opening fence:
    //     "markdown": "`````\n\n```\naaa",
    //     "html": "<pre><code>\n```\naaa</code></pre>"
    // },
    // "98": {//TODO wrong token
    //     "markdown": "> ```\n> aaa\n\nbbb",
    //     "html": "<blockquote><pre><code>aaa</code></pre></blockquote><p>bbb</p>"
    // },
    "99": {
        "markdown": "```\n\n  \n```",
        "html": "<pre><code>\n  </code></pre>"
    },
    "100": {
        "markdown": "```\n```",
        "html": "<pre><code></code></pre>"
    },
    "101": {
        "markdown": " ```\n aaa\naaa\n```",
        "html": "<pre><code>aaa\naaa</code></pre>"
    },
    "102": {
        "markdown": "  ```\naaa\n  aaa\naaa\n  ```",
        "html": "<pre><code>aaa\naaa\naaa</code></pre>"
    },
    "103": {
        "markdown": "   ```\n   aaa\n    aaa\n  aaa\n   ```",
        "html": "<pre><code>aaa\n aaa\naaa</code></pre>"
    },
    "104": {
        "markdown": "    ```\n    aaa\n    ```",
        "html": "<pre><code>```\naaa\n```</code></pre>"
    },
    "105": {
        "markdown": "```\naaa\n  ```",
        "html": "<pre><code>aaa</code></pre>"
    },
    "106": {
        "markdown": "   ```\naaa\n  ```",
        "html": "<pre><code>aaa</code></pre>"
    },
    // "107": {//TODO wrong token: 4space indented fences are not closing code block
    //     "markdown": "```\naaa\n    ```",
    //     "html": "<pre><code>aaa\n    ```</code></pre>"
    // },
    // "108": {//TODO wrong token: Code fences (opening and closing) cannot contain internal spaces (oneline code
    //  // blocks should be codespan within paragraph):
    //     "markdown": "``` ```\naaa",
    //     "html": "<p><code> </code>\naaa</p>"
    // },
    "109": {
        "markdown": "~~~~~~\naaa\n~~~ ~~",
        "html": "<pre><code>aaa\n~~~ ~~</code></pre>"
    },
    // "110": {//TODO wrong token: Fenced code blocks can interrupt paragraphs
    //     "markdown": "foo\n```\nbar\n```\nbaz",
    //     "html": "<p>foo</p><pre><code>bar</code></pre><p>baz</p>"
    // },
    "111": {
        "markdown": "foo\n---\n~~~\nbar\n~~~\n# baz",
        "html": "<h2>foo</h2><pre><code>bar</code></pre><h1>baz</h1>"
    },
    "112": {
        "markdown": "```ruby\ndef foo(x)\n  return 3\nend\n```",
        "html": "<pre><code class=\"language-ruby\">def foo(x)\n  return 3\nend</code></pre>"
    },
    "113": {
        "markdown": "~~~~    ruby startline=3 $%@#$\ndef foo(x)\n  return 3\nend\n~~~~~~~",
        "html": "<pre><code class=\"language-ruby\">def foo(x)\n  return 3\nend</code></pre>"
    },
    "114": {
        "markdown": "````;\n````",
        "html": "<pre><code class=\"language-;\"></code></pre>"
    },
    // "115": {//TODO wrong token: Code fences (opening and closing) cannot contain internal spaces (oneline code
    //     //  blocks should be codespan within paragraph):
    //     "markdown": "``` aa ```\nfoo",
    //     "html": "<p><code>aa</code>\nfoo</p>"
    // },
    // "116": {//TODO wrong token: Info strings for tilde code blocks can contain backticks and tildes:
    //     "markdown": "~~~ aa ``` ~~~\nfoo\n~~~",
    //     "html": "<pre><code class=\"language-aa\">foo</code></pre>"
    // },
    "117": {
        "markdown": "```\n``` aaa\n```",
        "html": "<pre><code>``` aaa</code></pre>"
    },
    // "118": {//TODO
    //     "markdown": "<table><tr><td><pre>\n**Hello**,\n\n_world_.</pre></td></tr></table>",
    //     "html": "<table><tr><td><pre>\n**Hello**,<p><em>world</em>.</pre></p></td></tr></table>"
    // },
    "119": {
        "markdown": "<table>\n  <tr>\n    <td>\n           hi\n    </td>\n  </tr></table>\n\nokay.",
        "html": "<table>\n  <tr>\n    <td>\n           hi\n    </td>\n  </tr></table><p>okay.</p>"
    },
    // "120": {//TODO foo should not be tag
    //     "markdown": " <div>\n  *hello*\n         <foo><a>",
    //     "html": " <div>\n  *hello*\n         <foo><a>"
    // },
    // "121": {
    //     "markdown": "</div>\n*foo*",
    //     "html": "</div>\n*foo*"
    // },
    "121": {
        "markdown": "</div>\n*foo*",
        "html": "&lt;/div&gt;\n*foo*"
    },
    "122": {
        "markdown": "<DIV CLASS=\"foo\">\n\n*Markdown*\n</DIV>",
        "html": "<DIV CLASS=\"foo\"><p><em>Markdown</em></p></DIV>"
    },
    "123": {
        "markdown": "<div id=\"foo\"\n  class=\"bar\"></div>",
        "html": "<div id=\"foo\"\n  class=\"bar\"></div>"
    },
    "124": {
        "markdown": "<div id=\"foo\" class=\"bar\n  baz\"></div>",
        "html": "<div id=\"foo\" class=\"bar\n  baz\"></div>"
    },
    "125": {
        "markdown": "<div>\n*foo*\n\n*bar*",
        "html": "<div>\n*foo*<p><em>bar</em></p>"
    },
    /*"126": {//TODO garbage unclosed tags
        "markdown": "<div id=\"foo\"\n*hi*",
        "html": "<div id=\"foo\"\n*hi*"
    },
    "127": {
        "markdown": "<div class\nfoo",
        "html": "<div class\nfoo"
    },
    "128": {
        "markdown": "<div *???-&&&-<---\n*foo*",
        "html": "<div *???-&&&-<---\n*foo*"
    },*/
    "129": {
        "markdown": "<div><a href=\"bar\">*foo*</a></div>",
        "html": "<div><a href=\"bar\">*foo*</a></div>"
    },
    "130": {
        "markdown": "<table><tr><td>\nfoo</td></tr></table>",
        "html": "<table><tr><td>\nfoo</td></tr></table>"
    },
    "131": {
        "markdown": "<div></div>\n``` c\nint x = 33;\n```",
        "html": "<div></div>\n``` c\nint x = 33;\n```"
    },
    "132": {
        "markdown": "<a href=\"foo\">\n*bar*</a>",
        "html": "<a href=\"foo\">\n*bar*</a>"
    },
    "133": {
        "markdown": "<Warning>\n*bar*</Warning>",
        "html": "<Warning>\n*bar*</Warning>"
    },
    "134": {
        "markdown": "<i class=\"foo\">\n*bar*</i>",
        "html": "<i class=\"foo\">\n*bar*</i>"
    },
    // "135": {
    //     "markdown": "</ins>\n*bar*",
    //     "html": "</ins>\n*bar*"
    // },
    "135": {
        "markdown": "</ins>\n*bar*",
        "html": "&lt;/ins&gt;\n*bar*"
    },
    "136": {
        "markdown": "<del>\n*foo*</del>",
        "html": "<del>\n*foo*</del>"
    },
    "137": {
        "markdown": "<del>\n\n*foo*\n</del>",
        "html": "<del><p><em>foo</em></p></del>"
    },
    // "138": {//TODO wrong tags? should interprete markdown
    //     "markdown": "<del>*foo*</del>",
    //     "html": "<p><del><em>foo</em></del></p>"
    // },
    // "139": {//TODO HTML tags designed to contain literal content
    //     "markdown": "<pre language=\"haskell\"><code>\nimport Text.HTML.TagSoup\n\nmain :: IO ()\nmain = print $ parseTags tags</code></pre>\nokay",
    //     "html": "<pre language=\"haskell\"><code>\nimport Text.HTML.TagSoup\n\nmain :: IO ()\nmain = print $ parseTags tags</code></pre><p>okay</p>"
    // },
    /*"140": {
        "markdown": "<script type=\"text/javascript\">\n// JavaScript example\n\ndocument.getElementById(\"demo\").innerHTML = \"Hello JavaScript!\";</script>\nokay",
        "html": "<script type=\"text/javascript\">\n// JavaScript example\n\ndocument.getElementById(\"demo\").innerHTML = \"Hello JavaScript!\";</script><p>okay</p>"
    },
    "141": {
        "markdown": "<style\n  type=\"text/css\">\nh1 {color:red;}\n\np {color:blue;}</style>\nokay",
        "html": "<style\n  type=\"text/css\">\nh1 {color:red;}\n\np {color:blue;}</style><p>okay</p>"
    },
    "142": {
        "markdown": "<style\n  type=\"text/css\">\n\nfoo",
        "html": "<style\n  type=\"text/css\">\n\nfoo"
    },*/
    // "143": {
    //     "markdown": "> <div>\n> foo\n\nbar",
    //     "html": "<blockquote><div>\nfoo</blockquote><p>bar</p>"
    // },
    "143": {
        "markdown": "> <div>\n> foo\n\nbar",
        "html": "<blockquote><div>\nfoo</div></blockquote><p>bar</p>"
    },
    // "144": {
    //     "markdown": "- <div>\n- foo",
    //     "html": "<ul><li><div></li><li>foo</li></ul>"
    // },
    "144": {
        "markdown": "- <div>\n- foo",
        "html": "<ul><li><div></div></li><li>foo</li></ul>"
    },
    // "145": {//TODO HTML tags designed to contain literal content
    //     "markdown": "<style>p{color:red;}</style>\n*foo*",
    //     "html": "<style>p{color:red;}</style><p><em>foo</em></p>"
    // },
    // "146": {//TODO comment *baz* should not be emphasys
    //     "markdown": "<!-- foo -->*bar*\n*baz*",
    //     "html": "<!-- foo -->*bar*<p><em>baz</em></p>"
    // },
    // "147": {//TODO HTML tags designed to contain literal content
    //     "markdown": "<script>\nfoo</script>1. *bar*",
    //     "html": "<script>\nfoo</script>1. *bar*"
    // },
    "148": {
        "markdown": "<!-- Foo\n\nbar\n   baz -->\nokay",
        "html": "<!-- Foo\n\nbar\n   baz --><p>okay</p>"
    },
    // "149": {//TODO HTML tags designed to contain literal content
    //     "markdown": "<?php\n\n  echo '>';\n\n?>\nokay",
    //     "html": "<?php\n\n  echo '>';\n\n?><p>okay</p>"
    // },
    // "150": {//TODO declaration
    //     "markdown": "<!DOCTYPE html>",
    //     "html": "<!DOCTYPE html>"
    // },
    // "151": {//TODO CDATA
    //     "markdown": "<![CDATA[\nfunction matchwo(a,b)\n{\n  if (a < b && a < 0) then {\n    return 1;\n\n  } else {\n\n    return 0;\n  }\n}\n]]>\nokay",
    //     "html": "<![CDATA[\nfunction matchwo(a,b)\n{\n  if (a < b && a < 0) then {\n    return 1;\n\n  } else {\n\n    return 0;\n  }\n}\n]]><p>okay</p>"
    // },
    // "152": {//TODO comment
    //     "markdown": "  <!-- foo -->\n\n    <!-- foo -->",
    //     "html": "  <!-- foo --><pre><code>&lt;!-- foo --&gt;</code></pre>"
    // },
    "152": {//TODO comment
        "markdown": "  <!-- foo -->\n\n    <!-- foo -->",
        "html": "<!-- foo --><pre><code>&lt;!-- foo --&gt;</code></pre>"
    },
    "153": {
        "markdown": "  <div>\n\n    <div>",
        "html": "  <div><pre><code>&lt;div&gt;</code></pre></div>"
    },
    // "154": {//TODO paragraph
    //     "markdown": "Foo<div>\nbar</div>",
    //     "html": "<p>Foo</p><div>\nbar</div>"
    // },
    "155": {
        "markdown": "<div>\nbar</div>\n*foo*",
        "html": "<div>\nbar</div>\n*foo*"
    },
    // "156": {//TODO paragraph
    //     "markdown": "Foo<a href=\"bar\">\nbaz",
    //     "html": "<p>Foo<a href=\"bar\">\nbaz</p>"
    // },
    "156": {//TODO paragraph
        "markdown": "Foo<a href=\"bar\">\nbaz",
        "html": "<p>Foo<a href=\"bar\">baz</a></p>"
    },
    "157": {
        "markdown": "<div>\n\n*Emphasized* text.\n</div>",
        "html": "<div><p><em>Emphasized</em> text.</p></div>"
    },
    "158": {
        "markdown": "<div>\n*Emphasized* text.</div>",
        "html": "<div>\n*Emphasized* text.</div>"
    },
    "159": {
        "markdown": "<table>\n<tr>\n<td>\nHi</td>\n</tr>\n</table>",
        "html": "<table>\n<tr>\n<td>\nHi</td>\n</tr>\n</table>"
    },
    // "160": {//TODO newlines are not correct
    //     "markdown": "<table>\n\n  <tr>\n\n    <td>\n      Hi\n    </td>\n\n  </tr>\n</table>",
    //     "html": "<table>\n  <tr><pre><code>&lt;td&gt;\n  Hi\n&lt;/td&gt;</code></pre>\n  </tr></table>"
    // },
    "160": {
        "markdown": "<table>\n\n  <tr>\n\n    <td>\n      Hi\n    </td>\n\n  </tr>\n</table>",
        "html": "<table>  <tr><pre><code>&lt;td&gt;\n  Hi\n&lt;/td&gt;</code></pre>  </tr>\n</table>"
    },
    "161": {
        "markdown": "[foo]: /url \"title\"\n\n[foo]",
        "html": "<p><a href=\"/url\" title=\"title\">foo</a></p>"
    },
    "162": {
        "markdown": "   [foo]: \n      /url  \n           'the title'  \n\n[foo]",
        "html": "<p><a href=\"/url\" title=\"the title\">foo</a></p>"
    },
    // "163": {//TODO * should not be em
    //     "markdown": "[Foo*bar\\]]:my_(url) 'title (with parens)'\n\n[Foo*bar\\]]",
    //     "html": "<p><a href=\"my_(url)\" title=\"title (with parens)\">Foo*bar]</a></p>"
    // },
    // "164": {//TODO wrong token title is not recognized
    //     "markdown": "[Foo bar]:<my url>\n'title'\n\n[Foo bar]",
    //     "html": "<p><a href=\"my%20url\" title=\"title\">Foo bar</a></p>"
    // },
    "165": {
        "markdown": "[foo]: /url '\ntitle\nline1\nline2\n'\n\n[foo]",
        "html": "<p><a href=\"/url\" title=\"\ntitle\nline1\nline2\n\">foo</a></p>"
    },
    // "166": {//TODO invalid url (wrong token)
    //     "markdown": "[foo]: /url 'title\n\nwith blank line'\n\n[foo]",
    //     "html": "<p>[foo]: /url 'title</p><p>with blank line'</p><p>[foo]</p>"
    // },
    "167": {
        "markdown": "[foo]:\n/url\n\n[foo]",
        "html": "<p><a href=\"/url\">foo</a></p>"
    },
    // "168": {//TODO invalid url (wrong token)
    //     "markdown": "[foo]:\n\n[foo]",
    //     "html": "<p>[foo]:</p><p>[foo]</p>"
    // },
    "169": {
        "markdown": "[foo]: <>\n\n[foo]",
        "html": "<p><a href=\"\">foo</a></p>"
    },
    // "170": {//TODO invalid url (wrong token)
    //     "markdown": "[foo]: <bar>(baz)\n\n[foo]",
    //     "html": "<p>[foo]: <bar>(baz)</p><p>[foo]</p>"
    // },
    // "171": {//TODO escapes in url
    //     "markdown": "[foo]: /url\\bar\\*baz \"foo\\\"bar\\baz\"\n\n[foo]",
    //     "html": "<p><a href=\"/url%5Cbar*baz\" title=\"foo&quot;bar\\baz\">foo</a></p>"
    // },
    "172": {
        "markdown": "[foo]\n\n[foo]: url",
        "html": "<p><a href=\"url\">foo</a></p>"
    },
    "173": {
        "markdown": "[foo]\n\n[foo]: first\n[foo]: second",
        "html": "<p><a href=\"first\">foo</a></p>"
    },
    "174": {
        "markdown": "[FOO]: /url\n\n[Foo]",
        "html": "<p><a href=\"/url\">Foo</a></p>"
    },
    "175": {
        "markdown": "[ΑΓΩ]: /φου\n\n[αγω]",
        "html": "<p><a href=\"/%CF%86%CE%BF%CF%85\">αγω</a></p>"
    },
    "176": {
        "markdown": "[foo]: /url",
        "html": ""
    },
    // "177": {//TODO newlines in link
    //     "markdown": "[\nfoo\n]: /url\nbar",
    //     "html": "<p>bar</p>"
    // },
    // "178": {//TODO is not link
    //     "markdown": "[foo]: /url \"title\" ok",
    //     "html": "<p>[foo]: /url &quot;title&quot; ok</p>"
    // },
    // "179": {//TODO not title
    //     "markdown": "[foo]: /url\n\"title\" ok",
    //     "html": "<p>&quot;title&quot; ok</p>"
    // },
    // "180": {//TODO &quot;s
    //     "markdown": "    [foo]: /url \"title\"\n\n[foo]",
    //     "html": "<pre><code>[foo]: /url &quot;title&quot;</code></pre><p>[foo]</p>"
    // },
    "181": {
        "markdown": "```\n[foo]: /url\n```\n\n[foo]",
        "html": "<pre><code>[foo]: /url</code></pre><p>[foo]</p>"
    },
    // "182": {//TODO link shouldn't interrupt paragraph
    //     "markdown": "Foo\n[bar]: /baz\n\n[bar]",
    //     "html": "<p>Foo\n[bar]: /baz</p><p>[bar]</p>"
    // },
    "183": {
        "markdown": "# [Foo]\n[foo]: /url\n> bar",
        "html": "<h1><a href=\"/url\">Foo</a></h1><blockquote><p>bar</p></blockquote>"
    },
    "184": {
        "markdown": "[foo]: /url\nbar\n===\n[foo]",
        "html": "<h1>bar</h1><p><a href=\"/url\">foo</a></p>"
    },
    "185": {
        "markdown": "[foo]: /url\n===\n[foo]",
        "html": "<p>===\n<a href=\"/url\">foo</a></p>"
    },
    "186": {
        "markdown": "[foo]: /foo-url \"foo\"\n[bar]: /bar-url\n  \"bar\"\n[baz]: /baz-url\n\n[foo],\n[bar],\n[baz]",
        "html": "<p><a href=\"/foo-url\" title=\"foo\">foo</a>,\n"
            + "<a href=\"/bar-url\" title=\"bar\">bar</a>,\n"
            + "<a href=\"/baz-url\">baz</a></p>"
    },
    "187": {
        "markdown": "[foo]\n\n> [foo]: /url",
        "html": "<p><a href=\"/url\">foo</a></p><blockquote></blockquote>"
    },
    "188": {
        "markdown": "[foo]: /url",
        "html": ""
    },
    "189": {
        "markdown": "aaa\n\nbbb",
        "html": "<p>aaa</p><p>bbb</p>"
    },
    "190": {
        "markdown": "aaa\nbbb\n\nccc\nddd",
        "html": "<p>aaa\nbbb</p><p>ccc\nddd</p>"
    },
    "191": {
        "markdown": "aaa\n\n\nbbb",
        "html": "<p>aaa</p><p>bbb</p>"
    },
    "192": {
        "markdown": "  aaa\n bbb",
        "html": "<p>aaa\nbbb</p>"
    },
    "193": {
        "markdown": "aaa\n             bbb\n                                       ccc",
        "html": "<p>aaa\nbbb\nccc</p>"
    },
    "194": {
        "markdown": "   aaa\nbbb",
        "html": "<p>aaa\nbbb</p>"
    },
    "195": {
        "markdown": "    aaa\nbbb",
        "html": "<pre><code>aaa</code></pre><p>bbb</p>"
    },
    "196": {
        "markdown": "aaa     \nbbb     ",
        "html": "<p>aaa<br />\nbbb</p>"
    },
    "197": {
        "markdown": "  \n\naaa\n  \n\n# aaa\n\n  ",
        "html": "<p>aaa</p><h1>aaa</h1>"
    },
    /*"198": {//TODO tables extensions
        "markdown": "| foo | bar |\n| --- | --- |\n| baz | bim |",
        "html": "<table><thead><tr><th>foo</th><th>bar</th></tr></thead><tbody><tr><td>baz</td><td>bim</td></tr></tbody></table>"
    },
    "199": {
        "markdown": "| abc | defghi |\n:-: | -----------:\nbar | baz",
        "html": "<table><thead><tr><th align=\"center\">abc</th><th align=\"right\">defghi</th></tr></thead><tbody><tr><td align=\"center\">bar</td><td align=\"right\">baz</td></tr></tbody></table>"
    },
    "200": {
        "markdown": "| f\\|oo  |\n| ------ |\n| b `\\|` az |\n| b **\\|** im |",
        "html": "<table><thead><tr><th>f|oo</th></tr></thead><tbody><tr><td>b <code>|</code> az</td></tr><tr><td>b <strong>|</strong> im</td></tr></tbody></table>"
    },
    "201": {
        "markdown": "| abc | def |\n| --- | --- |\n| bar | baz |\n> bar",
        "html": "<table><thead><tr><th>abc</th><th>def</th></tr></thead><tbody><tr><td>bar</td><td>baz</td></tr></tbody></table><blockquote><p>bar</p></blockquote>"
    },
    "202": {
        "markdown": "| abc | def |\n| --- | --- |\n| bar | baz |\nbar\n\nbar",
        "html": "<table><thead><tr><th>abc</th><th>def</th></tr></thead><tbody><tr><td>bar</td><td>baz</td></tr><tr><td>bar</td><td></td></tr></tbody></table><p>bar</p>"
    },
    "203": {
        "markdown": "| abc | def |\n| --- |\n| bar |",
        "html": "<p>| abc | def |\n| --- |\n| bar |</p>"
    },
    "204": {
        "markdown": "| abc | def |\n| --- | --- |\n| bar |\n| bar | baz | boo |",
        "html": "<table><thead><tr><th>abc</th><th>def</th></tr></thead><tbody><tr><td>bar</td><td></td></tr><tr><td>bar</td><td>baz</td></tr></tbody></table>"
    },
    "205": {
        "markdown": "| abc | def |\n| --- | --- |",
        "html": "<table><thead><tr><th>abc</th><th>def</th></tr></thead></table>"
    },*/
    "206": {
        "markdown": "> # Foo\n> bar\n> baz",
        "html": "<blockquote><h1>Foo</h1><p>bar\nbaz</p></blockquote>"
    },
    "207": {
        "markdown": "># Foo\n>bar\n> baz",
        "html": "<blockquote><h1>Foo</h1><p>bar\nbaz</p></blockquote>"
    },
    "208": {
        "markdown": "   > # Foo\n   > bar\n > baz",
        "html": "<blockquote><h1>Foo</h1><p>bar\nbaz</p></blockquote>"
    },
    "209": {
        "markdown": "    > # Foo\n    > bar\n    > baz",
        "html": "<pre><code>&gt; # Foo\n&gt; bar\n&gt; baz</code></pre>"
    },
    "210": {
        "markdown": "> # Foo\n> bar\nbaz",
        "html": "<blockquote><h1>Foo</h1><p>bar\nbaz</p></blockquote>"
    },
    "211": {
        "markdown": "> bar\nbaz\n> foo",
        "html": "<blockquote><p>bar\nbaz\nfoo</p></blockquote>"
    },
    "212": {
        "markdown": "> foo\n---",
        "html": "<blockquote><p>foo</p></blockquote><hr />"
    },
    "213": {
        "markdown": "> - foo\n- bar",
        "html": "<blockquote><ul><li>foo</li></ul></blockquote><ul><li>bar</li></ul>"
    },
    "214": {
        "markdown": ">     foo\n    bar",
        "html": "<blockquote><pre><code>foo</code></pre></blockquote><pre><code>bar</code></pre>"
    },
    // "215": {//TODO wrong token, shouldn't be blockquote
    //     "markdown": "> ```\nfoo\n```",
    //     "html": "<blockquote><pre><code></code></pre></blockquote><p>foo</p><pre><code></code></pre>"
    // },
    "216": {
        "markdown": "> foo\n    - bar",
        "html": "<blockquote><p>foo\n- bar</p></blockquote>"
    },
    "217": {
        "markdown": ">",
        "html": "<blockquote></blockquote>"
    },
    "218": {
        "markdown": ">\n>  \n> ",
        "html": "<blockquote></blockquote>"
    },
    "219": {
        "markdown": ">\n> foo\n>  ",
        "html": "<blockquote><p>foo</p></blockquote>"
    },
    "220": {
        "markdown": "> foo\n\n> bar",
        "html": "<blockquote><p>foo</p></blockquote><blockquote><p>bar</p></blockquote>"
    },
    "221": {
        "markdown": "> foo\n> bar",
        "html": "<blockquote><p>foo\nbar</p></blockquote>"
    },
    "222": {
        "markdown": "> foo\n>\n> bar",
        "html": "<blockquote><p>foo</p><p>bar</p></blockquote>"
    },
    "223": {
        "markdown": "foo\n> bar",
        "html": "<p>foo</p><blockquote><p>bar</p></blockquote>"
    },
    "224": {
        "markdown": "> aaa\n***\n> bbb",
        "html": "<blockquote><p>aaa</p></blockquote><hr /><blockquote><p>bbb</p></blockquote>"
    },
    "225": {
        "markdown": "> bar\nbaz",
        "html": "<blockquote><p>bar\nbaz</p></blockquote>"
    },
    "226": {
        "markdown": "> bar\n\nbaz",
        "html": "<blockquote><p>bar</p></blockquote><p>baz</p>"
    },
    "227": {
        "markdown": "> bar\n>\nbaz",
        "html": "<blockquote><p>bar</p></blockquote><p>baz</p>"
    },
    "228": {
        "markdown": "> > > foo\nbar",
        "html": "<blockquote><blockquote><blockquote><p>foo\nbar</p></blockquote></blockquote></blockquote>"
    },
    "229": {
        "markdown": ">>> foo\n> bar\n>>baz",
        "html": "<blockquote><blockquote><blockquote><p>foo\nbar\nbaz</p></blockquote></blockquote></blockquote>"
    },
    "230": {
        "markdown": ">     code\n\n>    not code",
        "html": "<blockquote><pre><code>code</code></pre></blockquote><blockquote><p>not code</p></blockquote>"
    },
    "231": {
        "markdown": "A paragraph\nwith two lines.\n\n    indented code\n\n> A block quote.",
        "html": "<p>A paragraph\nwith two lines.</p><pre><code>indented code</code></pre><blockquote><p>A block quote.</p></blockquote>"
    },
    "232": {
        "markdown": "1.  A paragraph\n    with two lines.\n\n        indented code\n\n    > A block quote.",
        "html": "<ol><li><p>A paragraph\nwith two lines.</p><pre><code>indented code</code></pre><blockquote><p>A block quote.</p></blockquote></li></ol>"
    },
    "233": {
        "markdown": "- one\n\n two",
        "html": "<ul><li>one</li></ul><p>two</p>"
    },
    "234": {
        "markdown": "- one\n\n  two",
        "html": "<ul><li><p>one</p><p>two</p></li></ul>"
    },
    "235": {
        "markdown": " -    one\n\n     two",
        "html": "<ul><li>one</li></ul><pre><code> two</code></pre>"
    },
    "236": {
        "markdown": " -    one\n\n      two",
        "html": "<ul><li><p>one</p><p>two</p></li></ul>"
    },
    // "237": {//TODO wrong token: two should be list, not support.function
    //     "markdown": "   > > 1.  one\n>>\n>>     two",
    //     "html": "<blockquote><blockquote><ol><li><p>one</p><p>two</p></li></ol></blockquote></blockquote>"
    // },
    "238": {
        "markdown": ">>- one\n>>\n  >  > two",
        "html": "<blockquote><blockquote><ul><li>one</li></ul><p>two</p></blockquote></blockquote>"
    },
    "239": {
        "markdown": "-one\n\n2.two",
        "html": "<p>-one</p><p>2.two</p>"
    },
    "240": {
        "markdown": "- foo\n\n\n  bar",
        "html": "<ul><li><p>foo</p><p>bar</p></li></ul>"
    },
    "241": {
        "markdown": "1.  foo\n\n    ```\n    bar\n    ```\n\n    baz\n\n    > bam",
        "html": "<ol><li><p>foo</p><pre><code>bar</code></pre><p>baz</p><blockquote><p>bam</p></blockquote></li></ol>"
    },
    "242": {
        "markdown": "- Foo\n\n      bar\n\n\n      baz",
        "html": "<ul><li><p>Foo</p><pre><code>bar\n\n\nbaz</code></pre></li></ul>"
    },
    "243": {
        "markdown": "123456789. ok",
        "html": "<ol start=\"123456789\"><li>ok</li></ol>"
    },
    "244": {
        "markdown": "1234567890. not ok",
        "html": "<p>1234567890. not ok</p>"
    },
    "245": {
        "markdown": "0. ok",
        "html": "<ol start=\"0\"><li>ok</li></ol>"
    },
    "246": {
        "markdown": "003. ok",
        "html": "<ol start=\"3\"><li>ok</li></ol>"
    },
    "247": {
        "markdown": "-1. not ok",
        "html": "<p>-1. not ok</p>"
    },
    "248": {
        "markdown": "- foo\n\n      bar",
        "html": "<ul><li><p>foo</p><pre><code>bar</code></pre></li></ul>"
    },
    "249": {
        "markdown": "  10.  foo\n\n           bar",
        "html": "<ol start=\"10\"><li><p>foo</p><pre><code>bar</code></pre></li></ol>"
    },
    "250": {
        "markdown": "    indented code\n\nparagraph\n\n    more code",
        "html": "<pre><code>indented code</code></pre><p>paragraph</p><pre><code>more code</code></pre>"
    },
    // "251": {//TODO indented code in same line as list start?
    //     "markdown": "1.     indented code\n\n   paragraph\n\n       more code",
    //     "html": "<ol><li><pre><code>indented code</code></pre><p>paragraph</p><pre><code>more code</code></pre></li></ol>"
    // },
    // "252": {
    //     "markdown": "1.      indented code\n\n   paragraph\n\n       more code",
    //     "html": "<ol><li><pre><code> indented code</code></pre><p>paragraph</p><pre><code>more code</code></pre></li></ol>"
    // },
    "253": {
        "markdown": "   foo\n\nbar",
        "html": "<p>foo</p><p>bar</p>"
    },
    "254": {
        "markdown": "-    foo\n\n  bar",
        "html": "<ul><li>foo</li></ul><p>bar</p>"
    },
    "255": {
        "markdown": "-  foo\n\n   bar",
        "html": "<ul><li><p>foo</p><p>bar</p></li></ul>"
    },
    // "256": {//TODO wrong tokens
    //     "markdown": "-\n  foo\n-\n  ```\n  bar\n  ```\n-\n      baz",
    //     "html": "<ul><li>foo</li><li><pre><code>bar</code></pre></li><li><pre><code>baz</code></pre></li></ul>"
    // },
    "257": {
        "markdown": "-   \n  foo",
        "html": "<ul><li>foo</li></ul>"
    },
    // "258": {//TODO wrong token, foo should not be list
    //     "markdown": "-\n\n  foo",
    //     "html": "<ul><li></li></ul><p>foo</p>"
    // },
    "259": {
        "markdown": "- foo\n-\n- bar",
        "html": "<ul><li>foo</li><li></li><li>bar</li></ul>"
    },
    // "260": {//TODO only spaces in list item
    //     "markdown": "- foo\n-   \n- bar",
    //     "html": "<ul><li>foo</li><li></li><li>bar</li></ul>"
    // },
    "261": {
        "markdown": "1. foo\n2.\n3. bar",
        "html": "<ol><li>foo</li><li></li><li>bar</li></ol>"
    },
    "262": {
        "markdown": "*",
        "html": "<ul><li></li></ul>"
    },
    "263": {
        "markdown": "foo\n*\n\nfoo\n1.",
        "html": "<p>foo\n*</p><p>foo\n1.</p>"
    },
    "264": {
        "markdown": " 1.  A paragraph\n     with two lines.\n\n         indented code\n\n     > A block quote.",
        "html": "<ol><li><p>A paragraph\nwith two lines.</p><pre><code>indented code</code></pre><blockquote><p>A block quote.</p></blockquote></li></ol>"
    },
    "265": {
        "markdown": "  1.  A paragraph\n      with two lines.\n\n          indented code\n\n      > A block quote.",
        "html": "<ol><li><p>A paragraph\nwith two lines.</p><pre><code>indented code</code></pre><blockquote><p>A block quote.</p></blockquote></li></ol>"
    },
    "266": {
        "markdown": "   1.  A paragraph\n       with two lines.\n\n           indented code\n\n       > A block quote.",
        "html": "<ol><li><p>A paragraph\nwith two lines.</p><pre><code>indented code</code></pre><blockquote><p>A block quote.</p></blockquote></li></ol>"
    },
    "267": {
        "markdown": "    1.  A paragraph\n        with two lines.\n\n            indented code\n\n        > A block quote.",
        "html": "<pre><code>1.  A paragraph\n    with two lines.\n\n        indented code\n\n    &gt; A block quote.</code></pre>"
    },
    "268": {
        "markdown": "  1.  A paragraph\nwith two lines.\n\n          indented code\n\n      > A block quote.",
        "html": "<ol><li><p>A paragraph\nwith two lines.</p><pre><code>indented code</code></pre><blockquote><p>A block quote.</p></blockquote></li></ol>"
    },
    "269": {
        "markdown": "  1.  A paragraph\n    with two lines.",
        "html": "<ol><li>A paragraph\nwith two lines.</li></ol>"
    },
    // "270": {//TODO blockquote in list
    //     "markdown": "> 1. > Blockquote\ncontinued here.",
    //     "html": "<blockquote><ol><li><blockquote><p>Blockquote\ncontinued here.</p></blockquote></li></ol></blockquote>"
    // },
    // "271": {//TODO blockquote in list
    //     "markdown": "> 1. > Blockquote\n> continued here.",
    //     "html": "<blockquote><ol><li><blockquote><p>Blockquote\ncontinued here.</p></blockquote></li></ol></blockquote>"
    // },
    "272": {
        "markdown": "- foo\n  - bar\n    - baz\n      - boo",
        "html": "<ul><li>foo<ul><li>bar<ul><li>baz<ul><li>boo</li></ul></li></ul></li></ul></li></ul>"
    },
    "273": {
        "markdown": "- foo\n - bar\n  - baz\n   - boo",
        "html": "<ul><li>foo</li><li>bar</li><li>baz</li><li>boo</li></ul>"
    },
    "274": {
        "markdown": "10) foo\n    - bar",
        "html": "<ol start=\"10\"><li>foo<ul><li>bar</li></ul></li></ol>"
    },
    "275": {
        "markdown": "10) foo\n   - bar",
        "html": "<ol start=\"10\"><li>foo</li></ol><ul><li>bar</li></ul>"
    },
    // "276": {//TODO wrong token (?) A list may be the first block in a list item
    //     "markdown": "- - foo",
    //     "html": "<ul><li><ul><li>foo</li></ul></li></ul>"
    // },
    // "277": {//TODO wrong token (?) A list may be the first block in a list item
    //     "markdown": "1. - 2. foo",
    //     "html": "<ol><li><ul><li><ol start=\"2\"><li>foo</li></ol></li></ul></li></ol>"
    // },
    // "278": {//TODO wrong token , Bar should be heading
    //     "markdown": "- # Foo\n- Bar\n  ---\n  baz",
    //     "html": "<ul><li><h1>Foo</h1></li><li><h2>Bar</h2>\nbaz</li></ul>"
    // },
    /*"279": {//TODO list extensions
        "markdown": "- [ ] foo\n- [x] bar",
        "html": "<ul><li><input disabled=\"\" type=\"checkbox\"> foo</li><li><input checked=\"\" disabled=\"\" type=\"checkbox\"> bar</li></ul>"
    },
    "280": {
        "markdown": "- [x] foo\n  - [ ] bar\n  - [x] baz\n- [ ] bim",
        "html": "<ul><li><input checked=\"\" disabled=\"\" type=\"checkbox\"> foo<ul><li><input disabled=\"\" type=\"checkbox\"> bar</li><li><input checked=\"\" disabled=\"\" type=\"checkbox\"> baz</li></ul></li><li><input disabled=\"\" type=\"checkbox\"> bim</li></ul>"
    },*/
    "281": {
        "markdown": "- foo\n- bar\n+ baz",
        "html": "<ul><li>foo</li><li>bar</li></ul><ul><li>baz</li></ul>"
    },
    "282": {
        "markdown": "1. foo\n2. bar\n3) baz",
        "html": "<ol><li>foo</li><li>bar</li></ol><ol start=\"3\"><li>baz</li></ol>"
    },
    "283": {
        "markdown": "Foo\n- bar\n- baz",
        "html": "<p>Foo</p><ul><li>bar</li><li>baz</li></ul>"
    },
    "284": {
        "markdown": "The number of windows in my house is\n14.  The number of doors is 6.",
        "html": "<p>The number of windows in my house is\n14.  The number of doors is 6.</p>"
    },
    "285": {
        "markdown": "The number of windows in my house is\n1.  The number of doors is 6.",
        "html": "<p>The number of windows in my house is</p><ol><li>The number of doors is 6.</li></ol>"
    },
    "286": {
        "markdown": "- foo\n\n- bar\n\n\n- baz",
        "html": "<ul><li><p>foo</p></li><li><p>bar</p></li><li><p>baz</p></li></ul>"
    },
    "287": {
        "markdown": "- foo\n  - bar\n    - baz\n\n\n      bim",
        "html": "<ul><li>foo<ul><li>bar<ul><li><p>baz</p><p>bim</p></li></ul></li></ul></li></ul>"
    },
    "288": {
        "markdown": "- foo\n- bar\n<!-- -->\n\n- baz\n- bim",
        "html": "<ul><li>foo</li><li>bar</li></ul><!-- --><ul><li>baz</li><li>bim</li></ul>"
    },
    "289": {
        "markdown": "-   foo\n\n    notcode\n\n-   foo\n<!-- -->\n\n    code",
        "html": "<ul><li><p>foo</p><p>notcode</p></li><li><p>foo</p></li></ul><!-- --><pre><code>code</code></pre>"
    },
    "290": {
        "markdown": "- a\n - b\n  - c\n   - d\n  - e\n - f\n- g",
        "html": "<ul><li>a</li><li>b</li><li>c</li><li>d</li><li>e</li><li>f</li><li>g</li></ul>"
    },
    // "291": {//TODO list indentation for ordered list should consider start value length
    //     "markdown": "1. a\n\n  2. b\n\n   3. c",
    //     "html": "<ol><li><p>a</p></li><li><p>b</p></li><li><p>c</p></li></ol>"
    // },
    // "292": {//TODO wrong token:  list items may not be indented more than three spaces
    //     "markdown": "- a\n - b\n  - c\n   - d\n    - e",
    //     "html": "<ul><li>a</li><li>b</li><li>c</li><li>d\n- e</li></ul>"
    // },
    // "293": {//TODO wrong token: 3. c should be code
    //     "markdown": "1. a\n\n  2. b\n\n    3. c",
    //     "html": "<ol><li><p>a</p></li><li><p>b</p></li></ol><pre><code>3. c</code></pre>"
    // },
    "294": {
        "markdown": "- a\n- b\n\n- c",
        "html": "<ul><li><p>a</p></li><li><p>b</p></li><li><p>c</p></li></ul>"
    },
    "295": {
        "markdown": "* a\n*\n\n* c",
        "html": "<ul><li><p>a</p></li><li></li><li><p>c</p></li></ul>"
    },
    "296": {
        "markdown": "- a\n- b\n\n  c\n- d",
        "html": "<ul><li><p>a</p></li><li><p>b</p><p>c</p></li><li><p>d</p></li></ul>"
    },
    // "297": {//TODO link
    //     "markdown": "- a\n- b\n\n  [ref]: /url\n- d",
    //     "html": "<ul><li><p>a</p></li><li><p>b</p></li><li><p>d</p></li></ul>"
    // },
    // "298": {//TODO wrong token: b should be codeblock, not codespan
    //     "markdown": "- a\n- ```\n  b\n\n\n  ```\n- c",
    //     "html": "<ul><li>a</li><li><pre><code>b\n\n</code></pre></li><li>c</li></ul>"
    // },
    "299": {
        "markdown": "- a\n  - b\n\n    c\n- d",
        "html": "<ul><li>a<ul><li><p>b</p><p>c</p></li></ul></li><li>d</li></ul>"
    },
    "300": {
        "markdown": "* a\n  > b\n  >\n* c",
        "html": "<ul><li>a<blockquote><p>b</p></blockquote></li><li>c</li></ul>"
    },
    // "301": {//TODO wrong token?
    //     "markdown": "- a\n  > b\n  ```\n  c\n  ```\n- d",
    //     "html": "<ul><li>a<blockquote><p>b</p></blockquote><pre><code>c</code></pre></li><li>d</li></ul>"
    // },
    "302": {
        "markdown": "- a",
        "html": "<ul><li>a</li></ul>"
    },
    "303": {
        "markdown": "- a\n  - b",
        "html": "<ul><li>a<ul><li>b</li></ul></li></ul>"
    },
    // "304": {//TODO wrong token: should be codeblock not codespan
    //     "markdown": "1. ```\n   foo\n   ```\n\n   bar",
    //     "html": "<ol><li><pre><code>foo</code></pre><p>bar</p></li></ol>"
    // },
    "305": {
        "markdown": "* foo\n  * bar\n\n  baz",
        "html": "<ul><li><p>foo</p><ul><li>bar</li></ul><p>baz</p></li></ul>"
    },
    "306": {
        "markdown": "- a\n  - b\n  - c\n\n- d\n  - e\n  - f",
        "html": "<ul><li><p>a</p><ul><li>b</li><li>c</li></ul></li><li><p>d</p><ul><li>e</li><li>f</li></ul></li></ul>"
    },
    // "307": {//TODO wrong token: last ` should not be support function
    //     "markdown": "`hi`lo`",
    //     "html": "<p><code>hi</code>lo`</p>"
    // },
    "308": {
        "markdown": "\\!\\\"\\#\\$\\%\\&\\'\\(\\)\\*\\+\\,\\-\\.\\/\\:\\;\\<\\=\\>\\?\\@\\[\\\\\\]\\^\\_\\`\\{\\|\\}\\~",
        "html": "<p>!&quot;#$%&amp;'()*+,-./:;&lt;=&gt;?@[\\]^_`{|}~</p>"
    },
    "309": {
        "markdown": "\\\t\\A\\a\\ \\3\\φ\\«",
        "html": "<p>\\\t\\A\\a\\ \\3\\φ\\«</p>"
    },
    // "310": {//TODO <> escapes, quote escapes
    //     "markdown": "\\*not emphasized*\n\\<br/> not a tag\n\\[not a link](/foo)\n\\`not code`\n1\\. not a list\n\\* not a list\n\\# not a heading\n\\[foo]: /url \"not a reference\"\n\\&ouml; not a character entity",
    //     "html": "<p>*not emphasized*\n&lt;br/&gt; not a tag\n[not a link](/foo)\n`not code`\n1. not a list\n* not a list\n# not a heading\n[foo]: /url &quot;not a reference&quot;\n&amp;ouml; not a character entity</p>"
    // },
    "311": {
        "markdown": "\\\\*emphasis*",
        "html": "<p>\\<em>emphasis</em></p>"
    },
    "312": {
        "markdown": "foo\\\nbar",
        "html": "<p>foo<br />\nbar</p>"
    },
    "313": {
        "markdown": "`` \\[\\` ``",
        "html": "<p><code>\\[\\`</code></p>"
    },
    "314": {
        "markdown": "    \\[\\]",
        "html": "<pre><code>\\[\\]</code></pre>"
    },
    "315": {
        "markdown": "~~~\n\\[\\]\n~~~",
        "html": "<pre><code>\\[\\]</code></pre>"
    },
    "316": {
        "markdown": "<http://example.com?find=\\*>",
        "html": "<p><a href=\"http://example.com?find=%5C*\">http://example.com?find=\\*</a></p>"
    },
    "317": {
        "markdown": "<a href=\"/bar\\/)\">",
        "html": "<a href=\"/bar\\/)\">"
    },
    // "318": {//TODO escape in url
    //     "markdown": "[foo](/bar\\* \"ti\\*tle\")",
    //     "html": "<p><a href=\"/bar*\" title=\"ti*tle\">foo</a></p>"
    // },
    // "319": {//TODO escape in url
    //     "markdown": "[foo]\n\n[foo]: /bar\\* \"ti\\*tle\"",
    //     "html": "<p><a href=\"/bar*\" title=\"ti*tle\">foo</a></p>"
    // },
    // "320": {//TODO wrong token: + should be escaped
    //     "markdown": "``` foo\\+bar\nfoo\n```",
    //     "html": "<pre><code class=\"language-foo+bar\">foo</code></pre>"
    // },
    // "321": {//TODO unsupported entities
    //     "markdown": "&nbsp; &amp; &copy; &AElig; &Dcaron;\n&frac34; &HilbertSpace; &DifferentialD;\n&ClockwiseContourIntegral; &ngE;",
    //     "html": "<p>  &amp; © Æ Ď\n¾ ℋ ⅆ\n∲ ≧̸</p>"
    // },
    // "322": {
    //     "markdown": "&#35; &#1234; &#992; &#0;",
    //     "html": "<p># Ӓ Ϡ �</p>"
    // },
    // "323": {
    //     "markdown": "&#X22; &#XD06; &#xcab;",
    //     "html": "<p>&quot; ആ ಫ</p>"
    // },
    // "324": {
    //     "markdown": "&nbsp &x; &#; &#x;\n&#87654321;\n&#abcdef0;\n&ThisIsNotDefined; &hi?;",
    //     "html": "<p>&amp;nbsp &amp;x; &amp;#; &amp;#x;\n&amp;#87654321;\n&amp;#abcdef0;\n&amp;ThisIsNotDefined; &amp;hi?;</p>"
    // },
    "325": {
        "markdown": "&copy",
        "html": "<p>&amp;copy</p>"
    },
    "326": {
        "markdown": "&MadeUpEntity;",
        "html": "<p>&amp;MadeUpEntity;</p>"
    },
    /*"327": {//Entity in URLs, link titles, and fenced code block info strings
        "markdown": "<a href=\"&ouml;&ouml;.html\">",
        "html": "<a href=\"&ouml;&ouml;.html\">"
    },
    "328": {
        "markdown": "[foo](/f&ouml;&ouml; \"f&ouml;&ouml;\")",
        "html": "<p><a href=\"/f%C3%B6%C3%B6\" title=\"föö\">foo</a></p>"
    },
    "329": {
        "markdown": "[foo]\n\n[foo]: /f&ouml;&ouml; \"f&ouml;&ouml;\"",
        "html": "<p><a href=\"/f%C3%B6%C3%B6\" title=\"föö\">foo</a></p>"
    },
    "330": {
        "markdown": "``` f&ouml;&ouml;\nfoo\n```",
        "html": "<pre><code class=\"language-föö\">foo</code></pre>"
    },*/
    "331": {
        "markdown": "`f&ouml;&ouml;`",
        "html": "<p><code>f&amp;ouml;&amp;ouml;</code></p>"
    },
    "332": {
        "markdown": "    f&ouml;f&ouml;",
        "html": "<pre><code>f&amp;ouml;f&amp;ouml;</code></pre>"
    },
    "333": {
        "markdown": "&#42;foo&#42;\n*foo*",
        "html": "<p>*foo*\n<em>foo</em></p>"
    },
    "334": {
        "markdown": "&#42; foo\n\n* foo",
        "html": "<p>* foo</p><ul><li>foo</li></ul>"
    },
    "335": {
        "markdown": "foo&#10;&#10;bar",
        "html": "<p>foo\n\nbar</p>"
    },
    "336": {
        "markdown": "&#9;foo",
        "html": "<p>\tfoo</p>"
    },
    // "337": {//TODO invalid url
    //     "markdown": "[a](url &quot;tit&quot;)",
    //     "html": "<p>[a](url &quot;tit&quot;)</p>"
    // },
    "338": {
        "markdown": "`foo`",
        "html": "<p><code>foo</code></p>"
    },
    "339": {
        "markdown": "`` foo ` bar ``",
        "html": "<p><code>foo ` bar</code></p>"
    },
    "340": {
        "markdown": "` `` `",
        "html": "<p><code>``</code></p>"
    },
    "341": {
        "markdown": "`  ``  `",
        "html": "<p><code> `` </code></p>"
    },
    "342": {
        "markdown": "` a`",
        "html": "<p><code> a</code></p>"
    },
    "343": {
        "markdown": "` b `",
        "html": "<p><code> b </code></p>"
    },
    "344": {
        "markdown": "` `\n`  `",
        "html": "<p><code> </code><code>  </code></p>"
    },
    "345": {
        "markdown": "``\nfoo\nbar  \nbaz\n``",
        "html": "<p><code>foo bar   baz</code></p>"
    },
    "346": {
        "markdown": "``\nfoo \n``",
        "html": "<p><code>foo </code></p>"
    },
    "347": {
        "markdown": "`foo   bar \nbaz`",
        "html": "<p><code>foo   bar  baz</code></p>"
    },
    // "348": {//TODO wrong token: last ` should not open code block
    //     "markdown": "`foo\\`bar`",
    //     "html": "<p><code>foo\\</code>bar`</p>"
    // },
    "349": {
        "markdown": "``foo`bar``",
        "html": "<p><code>foo`bar</code></p>"
    },
    "350": {
        "markdown": "` foo `` bar `",
        "html": "<p><code>foo `` bar</code></p>"
    },
    // "351": {//TODO wrong token: Code span backticks have higher precedence
    //     "markdown": "*foo`*`",
    //     "html": "<p>*foo<code>*</code></p>"
    // },
    // "352": {
    //     "markdown": "[not a `link](/foo`)",
    //     "html": "<p>[not a <code>link](/foo</code>)</p>"
    // },
    // "353": {//TODO quotes
    //     "markdown": "`<a href=\"`\">`",
    //     "html": "<p><code>&lt;a href=&quot;</code>&quot;&gt;`</p>"
    // },
    // "354": {//TODO html tags
    //     "markdown": "<a href=\"`\">`",
    //     "html": "<p><a href=\"`\">`</p>"
    // },
    // "355": {//TODO wrong token: last ` should not open code block
    //     "markdown": "`<http://foo.bar.`baz>`",
    //     "html": "<p><code>&lt;http://foo.bar.</code>baz&gt;`</p>"
    // },
    // "356": {
    //     "markdown": "<http://foo.bar.`baz>`",
    //     "html": "<p><a href=\"http://foo.bar.%60baz\">http://foo.bar.`baz</a>`</p>"
    // },
    // "357": {//TODO wrong token: backtick string is not closed sw we should have literal backticks:
    //     "markdown": "```foo``",
    //     "html": "<p>```foo``</p>"
    // },
    // "358": {
    //     "markdown": "`foo",
    //     "html": "<p>`foo</p>"
    // },
    // "359": {
    //     "markdown": "`foo``bar``",
    //     "html": "<p>`foo<code>bar</code></p>"
    // },
    "360": {
        "markdown": "*foo bar*",
        "html": "<p><em>foo bar</em></p>"
    },
    "361": {
        "markdown": "a * foo bar*",
        "html": "<p>a * foo bar*</p>"
    },
    "362": {
        "markdown": "a*\"foo\"*",
        "html": "<p>a*&quot;foo&quot;*</p>"
    },
    // "363": {//TODO wrong example?!!! why is not list?
    //     "markdown": "* a *",
    //     "html": "<p>* a *</p>"
    // },
    "364": {
        "markdown": "foo*bar*",
        "html": "<p>foo<em>bar</em></p>"
    },
    "365": {
        "markdown": "5*6*78",
        "html": "<p>5<em>6</em>78</p>"
    },
    "366": {
        "markdown": "_foo bar_",
        "html": "<p><em>foo bar</em></p>"
    },
    "367": {
        "markdown": "_ foo bar_",
        "html": "<p>_ foo bar_</p>"
    },
    "368": {
        "markdown": "a_\"foo\"_",
        "html": "<p>a_&quot;foo&quot;_</p>"
    },
    "369": {
        "markdown": "foo_bar_",
        "html": "<p>foo_bar_</p>"
    },
    "370": {
        "markdown": "5_6_78",
        "html": "<p>5_6_78</p>"
    },
    "371": {
        "markdown": "пристаням_стремятся_",
        "html": "<p>пристаням_стремятся_</p>"
    },
    // "372": {//TODO quots, cc should not be em, as it's not closed
    //     "markdown": "aa_\"bb\"_cc",
    //     "html": "<p>aa_&quot;bb&quot;_cc</p>"
    // },
    "373": {
        "markdown": "foo-_(bar)_",
        "html": "<p>foo-<em>(bar)</em></p>"
    },
    // "374": {//TODO should not be em, as it's not closed
    //     "markdown": "_foo*",
    //     "html": "<p>_foo*</p>"
    // },
    // "375": {
    //     "markdown": "*foo bar *",
    //     "html": "<p>*foo bar *</p>"
    // },
    "376": {
        "markdown": "*foo bar\n*",
        "html": "<p>*foo bar\n*</p>"
    },
    // "377": {//TODO wrong token: should not be emphasis
    //     "markdown": "*(*foo)",
    //     "html": "<p>*(*foo)</p>"
    // },
    // "378": {
    //     "markdown": "*(*foo*)*",
    //     "html": "<p><em>(<em>foo</em>)</em></p>"
    // },
    "379": {
        "markdown": "*foo*bar",
        "html": "<p><em>foo</em>bar</p>"
    },
    // "380": {//TODO not closed emphasys
    //     "markdown": "_foo bar _",
    //     "html": "<p>_foo bar _</p>"
    // },
    // "381": {//TODO wrong token: should not be emphasis
    //     "markdown": "_(_foo)",
    //     "html": "<p>_(_foo)</p>"
    // },
    // "382": {
    //     "markdown": "_(_foo_)_",
    //     "html": "<p><em>(<em>foo</em>)</em></p>"
    // },
    // "383": {//TODO not closed emphasys
    //     "markdown": "_foo_bar",
    //     "html": "<p>_foo_bar</p>"
    // },
    // "384": {
    //     "markdown": "_пристаням_стремятся",
    //     "html": "<p>_пристаням_стремятся</p>"
    // },
    "385": {
        "markdown": "_foo_bar_baz_",
        "html": "<p><em>foo_bar_baz</em></p>"
    },
    "386": {
        "markdown": "_(bar)_.",
        "html": "<p><em>(bar)</em>.</p>"
    },
    "387": {
        "markdown": "**foo bar**",
        "html": "<p><strong>foo bar</strong></p>"
    },
    "388": {
        "markdown": "** foo bar**",
        "html": "<p>** foo bar**</p>"
    },
    // "389": {//TODO wrong token, should not be emphasys; quots
    //     "markdown": "a**\"foo\"**",
    //     "html": "<p>a**&quot;foo&quot;**</p>"
    // },
    "390": {
        "markdown": "foo**bar**",
        "html": "<p>foo<strong>bar</strong></p>"
    },
    "391": {
        "markdown": "__foo bar__",
        "html": "<p><strong>foo bar</strong></p>"
    },
    "392": {
        "markdown": "__ foo bar__",
        "html": "<p>__ foo bar__</p>"
    },
    "393": {
        "markdown": "__\nfoo bar__",
        "html": "<p>__\nfoo bar__</p>"
    },
    // "394": {//TODO wrong token, should not be emphasys; quots
    //     "markdown": "a__\"foo\"__",
    //     "html": "<p>a__&quot;foo&quot;__</p>"
    // },
    // "395": {//TODO wrong token, should not be emphasys
    //     "markdown": "foo__bar__",
    //     "html": "<p>foo__bar__</p>"
    // },
    // "396": {
    //     "markdown": "5__6__78",
    //     "html": "<p>5__6__78</p>"
    // },
    // "397": {
    //     "markdown": "пристаням__стремятся__",
    //     "html": "<p>пристаням__стремятся__</p>"
    // },
    // "398": {//TODO nested emphasys
    //     "markdown": "__foo, __bar__, baz__",
    //     "html": "<p><strong>foo, <strong>bar</strong>, baz</strong></p>"
    // },
    "399": {
        "markdown": "foo-__(bar)__",
        "html": "<p>foo-<strong>(bar)</strong></p>"
    },
    // "400": {//TODO not closed emphasys
    //     "markdown": "**foo bar **",
    //     "html": "<p>**foo bar **</p>"
    // },
    // "401": {//TODO wrong token: should not be emphasis
    //     "markdown": "**(**foo)",
    //     "html": "<p>**(**foo)</p>"
    // },
    "402": {
        "markdown": "*(**foo**)*",
        "html": "<p><em>(<strong>foo</strong>)</em></p>"
    },
    "403": {
        "markdown": "**Gomphocarpus (*Gomphocarpus physocarpus*, syn.\n*Asclepias physocarpa*)**",
        "html": "<p><strong>Gomphocarpus (<em>Gomphocarpus physocarpus</em>, syn.\n<em>Asclepias physocarpa</em>)</strong></p>"
    },
    "404": {
        "markdown": "**foo \"*bar*\" foo**",
        "html": "<p><strong>foo &quot;<em>bar</em>&quot; foo</strong></p>"
    },
    "405": {
        "markdown": "**foo**bar",
        "html": "<p><strong>foo</strong>bar</p>"
    },
    // "406": {//TODO not closed emphasys
    //     "markdown": "__foo bar __",
    //     "html": "<p>__foo bar __</p>"
    // },
    // "407": {//TODO wrong token shouldn't be em
    //     "markdown": "__(__foo)",
    //     "html": "<p>__(__foo)</p>"
    // },
    "408": {
        "markdown": "_(__foo__)_",
        "html": "<p><em>(<strong>foo</strong>)</em></p>"
    },
    // "409": {//TODO wrong token, shouldn't be strong
    //     "markdown": "__foo__bar",
    //     "html": "<p>__foo__bar</p>"
    // },
    // "410": {
    //     "markdown": "__пристаням__стремятся",
    //     "html": "<p>__пристаням__стремятся</p>"
    // },
    // "411": {
    //     "markdown": "__foo__bar__baz__",
    //     "html": "<p><strong>foo__bar__baz</strong></p>"
    // },
    "412": {
        "markdown": "__(bar)__.",
        "html": "<p><strong>(bar)</strong>.</p>"
    },
    "413": {
        "markdown": "*foo [bar](/url)*",
        "html": "<p><em>foo <a href=\"/url\">bar</a></em></p>"
    },
    "414": {
        "markdown": "*foo\nbar*",
        "html": "<p><em>foo\nbar</em></p>"
    },
    "415": {
        "markdown": "_foo __bar__ baz_",
        "html": "<p><em>foo <strong>bar</strong> baz</em></p>"
    },
    // "416": {//TODO nested emphasys
    //     "markdown": "_foo _bar_ baz_",
    //     "html": "<p><em>foo <em>bar</em> baz</em></p>"
    // },
    // "417": {
    //     "markdown": "__foo_ bar_",
    //     "html": "<p><em><em>foo</em> bar</em></p>"
    // },
    // "418": {
    //     "markdown": "*foo *bar**",
    //     "html": "<p><em>foo <em>bar</em></em></p>"
    // },
    "419": {
        "markdown": "*foo **bar** baz*",
        "html": "<p><em>foo <strong>bar</strong> baz</em></p>"
    },
    "420": {
        "markdown": "*foo**bar**baz*",
        "html": "<p><em>foo<strong>bar</strong>baz</em></p>"
    },
    // "421": {//TODO wrong token
    //     "markdown": "*foo**bar*",
    //     "html": "<p><em>foo**bar</em></p>"
    // },
    // "422": {//TODO nested emphasys
    //     "markdown": "***foo** bar*",
    //     "html": "<p><em><strong>foo</strong> bar</em></p>"
    // },
    "423": {
        "markdown": "*foo **bar***",
        "html": "<p><em>foo <strong>bar</strong></em></p>"
    },
    "424": {
        "markdown": "*foo**bar***",
        "html": "<p><em>foo<strong>bar</strong></em></p>"
    },
    // "425": {//TODO nested emphasys
    //     "markdown": "foo***bar***baz",
    //     "html": "<p>foo<em><strong>bar</strong></em>baz</p>"
    // },
    // "426": {
    //     "markdown": "foo******bar*********baz",
    //     "html": "<p>foo<strong><strong><strong>bar</strong></strong></strong>***baz</p>"
    // },
    "427": {
        "markdown": "*foo **bar *baz* bim** bop*",
        "html": "<p><em>foo <strong>bar <em>baz</em> bim</strong> bop</em></p>"
    },
    "428": {
        "markdown": "*foo [*bar*](/url)*",
        "html": "<p><em>foo <a href=\"/url\"><em>bar</em></a></em></p>"
    },
    "429": {
        "markdown": "** is not an empty emphasis",
        "html": "<p>** is not an empty emphasis</p>"
    },
    "430": {
        "markdown": "**** is not an empty strong emphasis",
        "html": "<p>**** is not an empty strong emphasis</p>"
    },
    "431": {
        "markdown": "**foo [bar](/url)**",
        "html": "<p><strong>foo <a href=\"/url\">bar</a></strong></p>"
    },
    "432": {
        "markdown": "**foo\nbar**",
        "html": "<p><strong>foo\nbar</strong></p>"
    },
    "433": {
        "markdown": "__foo _bar_ baz__",
        "html": "<p><strong>foo <em>bar</em> baz</strong></p>"
    },
    // "434": {//TODO nested
    //     "markdown": "__foo __bar__ baz__",
    //     "html": "<p><strong>foo <strong>bar</strong> baz</strong></p>"
    // },
    // "435": {
    //     "markdown": "____foo__ bar__",
    //     "html": "<p><strong><strong>foo</strong> bar</strong></p>"
    // },
    // "436": {
    //     "markdown": "**foo **bar****",
    //     "html": "<p><strong>foo <strong>bar</strong></strong></p>"
    // },
    "437": {
        "markdown": "**foo *bar* baz**",
        "html": "<p><strong>foo <em>bar</em> baz</strong></p>"
    },
    "438": {
        "markdown": "**foo*bar*baz**",
        "html": "<p><strong>foo<em>bar</em>baz</strong></p>"
    },
    // "439": {//TODO nested
    //     "markdown": "***foo* bar**",
    //     "html": "<p><strong><em>foo</em> bar</strong></p>"
    // },
    "440": {
        "markdown": "**foo *bar***",
        "html": "<p><strong>foo <em>bar</em></strong></p>"
    },
    // "441": {//TODO nested
    //     "markdown": "**foo *bar **baz**\nbim* bop**",
    //     "html": "<p><strong>foo <em>bar <strong>baz</strong>\nbim</em> bop</strong></p>"
    // },
    "442": {
        "markdown": "**foo [*bar*](/url)**",
        "html": "<p><strong>foo <a href=\"/url\"><em>bar</em></a></strong></p>"
    },
    "443": {
        "markdown": "__ is not an empty emphasis",
        "html": "<p>__ is not an empty emphasis</p>"
    },
    "444": {
        "markdown": "____ is not an empty strong emphasis",
        "html": "<p>____ is not an empty strong emphasis</p>"
    },
    "445": {
        "markdown": "foo ***",
        "html": "<p>foo ***</p>"
    },
    // "446": {//TODO why last * doesn't have emphasysstate parent?
    //     "markdown": "foo *\\**",
    //     "html": "<p>foo <em>*</em></p>"
    // },
    // "447": {//TODO wrong token: last * is going into baremphasysstate
    //     "markdown": "foo *_*",
    //     "html": "<p>foo <em>_</em></p>"
    // },
    "448": {
        "markdown": "foo *****",
        "html": "<p>foo *****</p>"
    },
    // "449": {//TODO why last * doesn't have emphasysstate parent?
    //     "markdown": "foo **\\***",
    //     "html": "<p>foo <strong>*</strong></p>"
    // },
    // "450": {//TODO wrong token: last * is going into baremphasysstate
    //     "markdown": "foo **_**",
    //     "html": "<p>foo <strong>_</strong></p>"
    // },
    // "451": {//TODO wrong token
    //     "markdown": "**foo*",
    //     "html": "<p>*<em>foo</em></p>"
    // },
    "452": {
        "markdown": "*foo**",
        "html": "<p><em>foo</em>*</p>"
    },
    // "453": {//TODO wrong token
    //     "markdown": "***foo**",
    //     "html": "<p>*<strong>foo</strong></p>"
    // },
    // "454": {//TODO wrong token
    //     "markdown": "****foo*",
    //     "html": "<p>***<em>foo</em></p>"
    // },
    "455": {
        "markdown": "**foo***",
        "html": "<p><strong>foo</strong>*</p>"
    },
    "456": {
        "markdown": "*foo****",
        "html": "<p><em>foo</em>***</p>"
    },
    "457": {
        "markdown": "foo ___",
        "html": "<p>foo ___</p>"
    },
    // "458": {//TODO wrong token
    //     "markdown": "foo _\\__",
    //     "html": "<p>foo <em>_</em></p>"
    // },
    // "459": {
    //     "markdown": "foo _*_",
    //     "html": "<p>foo <em>*</em></p>"
    // },
    "460": {
        "markdown": "foo _____",
        "html": "<p>foo _____</p>"
    },
    // "461": {//TODO wrong token
    //     "markdown": "foo __\\___",
    //     "html": "<p>foo <strong>_</strong></p>"
    // },
    // "462": {
    //     "markdown": "foo __*__",
    //     "html": "<p>foo <strong>*</strong></p>"
    // },
    // "463": {
    //     "markdown": "__foo_",
    //     "html": "<p>_<em>foo</em></p>"
    // },
    "464": {
        "markdown": "_foo__",
        "html": "<p><em>foo</em>_</p>"
    },
    // "465": {//TODO Wrong token
    //     "markdown": "___foo__",
    //     "html": "<p>_<strong>foo</strong></p>"
    // },
    // "466": {
    //     "markdown": "____foo_",
    //     "html": "<p>___<em>foo</em></p>"
    // },
    "467": {
        "markdown": "__foo___",
        "html": "<p><strong>foo</strong>_</p>"
    },
    "468": {
        "markdown": "_foo____",
        "html": "<p><em>foo</em>___</p>"
    },
    "469": {
        "markdown": "**foo**",
        "html": "<p><strong>foo</strong></p>"
    },
    // "470": {//TODO wrong token
    //     "markdown": "*_foo_*",
    //     "html": "<p><em><em>foo</em></em></p>"
    // },
    "471": {
        "markdown": "__foo__",
        "html": "<p><strong>foo</strong></p>"
    },
    // "472": {//TODO wrong token
    //     "markdown": "_*foo*_",
    //     "html": "<p><em><em>foo</em></em></p>"
    // },
    // "473": {
    //     "markdown": "****foo****",
    //     "html": "<p><strong><strong>foo</strong></strong></p>"
    // },
    // "474": {
    //     "markdown": "____foo____",
    //     "html": "<p><strong><strong>foo</strong></strong></p>"
    // },
    // "475": {
    //     "markdown": "******foo******",
    //     "html": "<p><strong><strong><strong>foo</strong></strong></strong></p>"
    // },
    // "476": {
    //     "markdown": "***foo***",
    //     "html": "<p><em><strong>foo</strong></em></p>"
    // },
    // "477": {
    //     "markdown": "_____foo_____",
    //     "html": "<p><em><strong><strong>foo</strong></strong></em></p>"
    // },
    // "478": {
    //     "markdown": "*foo _bar* baz_",
    //     "html": "<p><em>foo _bar</em> baz_</p>"
    // },
    // "479": {
    //     "markdown": "*foo __bar *baz bim__ bam*",
    //     "html": "<p><em>foo <strong>bar *baz bim</strong> bam</em></p>"
    // },
    // "480": {
    //     "markdown": "**foo **bar baz**",
    //     "html": "<p>**foo <strong>bar baz</strong></p>"
    // },
    // "481": {
    //     "markdown": "*foo *bar baz*",
    //     "html": "<p>*foo <em>bar baz</em></p>"
    // },
    // "482": {
    //     "markdown": "*[bar*](/url)",
    //     "html": "<p>*<a href=\"/url\">bar*</a></p>"
    // },
    // "483": {
    //     "markdown": "_foo [bar_](/url)",
    //     "html": "<p>_foo <a href=\"/url\">bar_</a></p>"
    // },
    "484": {
        "markdown": "*<img src=\"foo\" title=\"*\"/>",
        "html": "<p>*<img src=\"foo\" title=\"*\"/></p>"
    },
    // "485": {//TODO wrong token
    //     "markdown": "**<a href=\"**\">",
    //     "html": "<p>**<a href=\"**\"></p>"
    // },
    // "486": {
    //     "markdown": "__<a href=\"__\">",
    //     "html": "<p>__<a href=\"__\"></p>"
    // },
    "487": {
        "markdown": "*a `*`*",
        "html": "<p><em>a <code>*</code></em></p>"
    },
    "488": {
        "markdown": "_a `_`_",
        "html": "<p><em>a <code>_</code></em></p>"
    },
    // "489": {//TODO wrong token
    //     "markdown": "**a<http://foo.bar/?q=**>",
    //     "html": "<p>**a<a href=\"http://foo.bar/?q=**\">http://foo.bar/?q=**</a></p>"
    // },
    // "490": {
    //     "markdown": "__a<http://foo.bar/?q=__>",
    //     "html": "<p>__a<a href=\"http://foo.bar/?q=__\">http://foo.bar/?q=__</a></p>"
    // },
    /*"491": {//TODO Strikethrough (extension)
        "markdown": "~~Hi~~ Hello, ~there~ world!",
        "html": "<p><del>Hi</del> Hello, <del>there</del> world!</p>"
    },
    "492": {
        "markdown": "This ~~has a\n\nnew paragraph~~.",
        "html": "<p>This ~~has a</p><p>new paragraph~~.</p>"
    },
    "493": {
        "markdown": "This will ~~~not~~~ strike.",
        "html": "<p>This will ~~~not~~~ strike.</p>"
    },*/
    "494": {
        "markdown": "[link](/uri \"title\")",
        "html": "<p><a href=\"/uri\" title=\"title\">link</a></p>"
    },
    "495": {
        "markdown": "[link](/uri)",
        "html": "<p><a href=\"/uri\">link</a></p>"
    },
    "496": {
        "markdown": "[link]()",
        "html": "<p><a href=\"\">link</a></p>"
    },
    "497": {
        "markdown": "[link](<>)",
        "html": "<p><a href=\"\">link</a></p>"
    },
    // "498": {//TODO wrong token: invalid destination
    //     "markdown": "[link](/my uri)",
    //     "html": "<p>[link](/my uri)</p>"
    // },
    "499": {
        "markdown": "[link](</my uri>)",
        "html": "<p><a href=\"/my%20uri\">link</a></p>"
    },
    // "500": {//TODO wrong token: destination cannot contain line breaks
    //     "markdown": "[link](foo\nbar)",
    //     "html": "<p>[link](foo\nbar)</p>"
    // },
    // "501": {
    //     "markdown": "[link](<foo\nbar>)",
    //     "html": "<p>[link](<foo\nbar>)</p>"
    // },
    "502": {
        "markdown": "[a](<b)c>)",
        "html": "<p><a href=\"b)c\">a</a></p>"
    },
    // "503": {//TODO wrong token, > is escaped
    //     "markdown": "[link](<foo\\>)",
    //     "html": "<p>[link](&lt;foo&gt;)</p>"
    // },
    // "504": {//TODO wrong token: pointy bracket is not matched
    //     "markdown": "[a](<b)c\n[a](<b)c>\n[a](<b>c)",
    //     "html": "<p>[a](&lt;b)c\n[a](&lt;b)c&gt;\n[a](<b>c)</p>"
    // },
    // "505": {//TODO escaped characters in link destination
    //     "markdown": "[link](\\(foo\\))",
    //     "html": "<p><a href=\"(foo)\">link</a></p>"
    // },
    // "506": {//TODO parentheses inside link destination
    //     "markdown": "[link](foo(and(bar)))",
    //     "html": "<p><a href=\"foo(and(bar))\">link</a></p>"
    // },
    // "507": {
    //     "markdown": "[link](foo\\(and\\(bar\\))",
    //     "html": "<p><a href=\"foo(and(bar)\">link</a></p>"
    // },
    "508": {
        "markdown": "[link](<foo(and(bar)>)",
        "html": "<p><a href=\"foo(and(bar)\">link</a></p>"
    },
    // "509": {//TODO escaped characters in link destination
    //     "markdown": "[link](foo\\)\\:)",
    //     "html": "<p><a href=\"foo):\">link</a></p>"
    // },
    "510": {
        "markdown": "[link](#fragment)\n\n[link](http://example.com#fragment)\n\n[link](http://example.com?foo=3#frag)",
        "html": "<p><a href=\"#fragment\">link</a></p><p><a href=\"http://example.com#fragment\">link</a></p><p><a href=\"http://example.com?foo=3#frag\">link</a></p>"
    },
    "511": {
        "markdown": "[link](foo\\bar)",
        "html": "<p><a href=\"foo%5Cbar\">link</a></p>"
    },
    // "512": {//TODO url escapes
    //     "markdown": "[link](foo%20b&auml;)",
    //     "html": "<p><a href=\"foo%20b%C3%A4\">link</a></p>"
    // },
    "513": {
        "markdown": "[link](\"title\")",
        "html": "<p><a href=\"%22title%22\">link</a></p>"
    },
    "514": {
        "markdown": "[link](/url \"title\")\n[link](/url 'title')\n[link](/url (title))",
        "html": "<p><a href=\"/url\" title=\"title\">link</a><a href=\"/url\" title=\"title\">link</a><a href=\"/url\" title=\"title\">link</a></p>"
    },
    "515": {
        "markdown": "[link](/url \"title \\\"&quot;\")",
        "html": "<p><a href=\"/url\" title=\"title &quot;&quot;\">link</a></p>"
    },
    // "516": {//TODO nbsp is not separating url from title
    //     "markdown": "[link](/url \"title\")",
    //     "html": "<p><a href=\"/url%C2%A0%22title%22\">link</a></p>"
    // },
    // "517": {//TODO wrong token
    //     "markdown": "[link](/url \"title \"and\" title\")",
    //     "html": "<p>[link](/url &quot;title &quot;and&quot; title&quot;)</p>"
    // },
    "518": {
        "markdown": "[link](/url 'title \"and\" title')",
        "html": "<p><a href=\"/url\" title=\"title &quot;and&quot; title\">link</a></p>"
    },
    "519": {
        "markdown": "[link](   /uri\n  \"title\"  )",
        "html": "<p><a href=\"/uri\" title=\"title\">link</a></p>"
    },
    "520": {
        "markdown": "[link] (/uri)",
        "html": "<p>[link] (/uri)</p>"
    },
    // "521": {//TODO nested brackets
    //     "markdown": "[link [foo [bar]]](/uri)",
    //     "html": "<p><a href=\"/uri\">link [foo [bar]]</a></p>"
    // },
    "522": {
        "markdown": "[link] bar](/uri)",
        "html": "<p>[link] bar](/uri)</p>"
    },
    // "523": {//TODO
    //     "markdown": "[link [bar](/uri)",
    //     "html": "<p>[link <a href=\"/uri\">bar</a></p>"
    // },
    "524": {
        "markdown": "[link \\[bar](/uri)",
        "html": "<p><a href=\"/uri\">link [bar</a></p>"
    },
    "525": {
        "markdown": "[link *foo **bar** `#`*](/uri)",
        "html": "<p><a href=\"/uri\">link <em>foo <strong>bar</strong> <code>#</code></em></a></p>"
    },
    "526": {
        "markdown": "[![moon](moon.jpg)](/uri)",
        "html": "<p><a href=\"/uri\"><img src=\"moon.jpg\" alt=\"moon\" /></a></p>"
    },
    // "527": {//TODO invalid link: can not have nested
    //     "markdown": "[foo [bar](/uri)](/uri)",
    //     "html": "<p>[foo <a href=\"/uri\">bar</a>](/uri)</p>"
    // },
    // "528": {
    //     "markdown": "[foo *[bar [baz](/uri)](/uri)*](/uri)",
    //     "html": "<p>[foo <em>[bar <a href=\"/uri\">baz</a>](/uri)</em>](/uri)</p>"
    // },
    // "529": {
    //     "markdown": "![[[foo](uri1)](uri2)](uri3)",
    //     "html": "<p><img src=\"uri3\" alt=\"[foo](uri2)\" /></p>"
    // },
    // "530": {//TODO wrong token: shouldn't go to emphasisState
    //     "markdown": "*[foo*](/uri)",
    //     "html": "<p>*<a href=\"/uri\">foo*</a></p>"
    // },
    // "531": {
    //     "markdown": "[foo *bar](baz*)",
    //     "html": "<p><a href=\"baz*\">foo *bar</a></p>"
    // },
    // "532": {//TODO wrong token: shouldn't go to linkLabel
    //     "markdown": "*foo [bar* baz]",
    //     "html": "<p><em>foo [bar</em> baz]</p>"
    // },
    // "533": {//TODO wrong tokens: precedences are not considered
    //     "markdown": "[foo <bar attr=\"](baz)\">",
    //     "html": "<p>[foo <bar attr=\"](baz)\"></p>"
    // },
    // "534": {
    //     "markdown": "[foo`](/uri)`",
    //     "html": "<p>[foo<code>](/uri)</code></p>"
    // },
    // "535": {
    //     "markdown": "[foo<http://example.com/?search=](uri)>",
    //     "html": "<p>[foo<a href=\"http://example.com/?search=%5D(uri)\">http://example.com/?search=](uri)</a></p>"
    // },
    // "536": {//TODO link references
    //     "markdown": "[foo][bar]\n\n[bar]: /url \"title\"",
    //     "html": "<p><a href=\"/url\" title=\"title\">foo</a></p>"
    // },
    // "537": {
    //     "markdown": "[link [foo [bar]]][ref]\n\n[ref]: /uri",
    //     "html": "<p><a href=\"/uri\">link [foo [bar]]</a></p>"
    // },
    // "538": {
    //     "markdown": "[link \\[bar][ref]\n\n[ref]: /uri",
    //     "html": "<p><a href=\"/uri\">link [bar</a></p>"
    // },
    // "539": {
    //     "markdown": "[link *foo **bar** `#`*][ref]\n\n[ref]: /uri",
    //     "html": "<p><a href=\"/uri\">link <em>foo <strong>bar</strong> <code>#</code></em></a></p>"
    // },
    // "540": {
    //     "markdown": "[![moon](moon.jpg)][ref]\n\n[ref]: /uri",
    //     "html": "<p><a href=\"/uri\"><img src=\"moon.jpg\" alt=\"moon\" /></a></p>"
    // },
    // "541": {
    //     "markdown": "[foo [bar](/uri)][ref]\n\n[ref]: /uri",
    //     "html": "<p>[foo <a href=\"/uri\">bar</a>]<a href=\"/uri\">ref</a></p>"
    // },
    // "542": {
    //     "markdown": "[foo *bar [baz][ref]*][ref]\n\n[ref]: /uri",
    //     "html": "<p>[foo <em>bar <a href=\"/uri\">baz</a></em>]<a href=\"/uri\">ref</a></p>"
    // },
    // "543": {
    //     "markdown": "*[foo*][ref]\n\n[ref]: /uri",
    //     "html": "<p>*<a href=\"/uri\">foo*</a></p>"
    // },
    // "544": {
    //     "markdown": "[foo *bar][ref]*\n\n[ref]: /uri",
    //     "html": "<p><a href=\"/uri\">foo *bar</a>*</p>"
    // },
    // "545": {
    //     "markdown": "[foo <bar attr=\"][ref]\">\n\n[ref]: /uri",
    //     "html": "<p>[foo <bar attr=\"][ref]\"></p>"
    // },
    // "546": {
    //     "markdown": "[foo`][ref]`\n\n[ref]: /uri",
    //     "html": "<p>[foo<code>][ref]</code></p>"
    // },
    // "547": {
    //     "markdown": "[foo<http://example.com/?search=][ref]>\n\n[ref]: /uri",
    //     "html": "<p>[foo<a href=\"http://example.com/?search=%5D%5Bref%5D\">http://example.com/?search=][ref]</a></p>"
    // },
    // "548": {
    //     "markdown": "[foo][BaR]\n\n[bar]: /url \"title\"",
    //     "html": "<p><a href=\"/url\" title=\"title\">foo</a></p>"
    // },
    // "549": {
    //     "markdown": "[ẞ]\n\n[SS]: /url",
    //     "html": "<p><a href=\"/url\">ẞ</a></p>"
    // },
    // "550": {
    //     "markdown": "[Foo\n  bar]: /url\n\n[Baz][Foo bar]",
    //     "html": "<p><a href=\"/url\">Baz</a></p>"
    // },
    // "551": {
    //     "markdown": "[foo] [bar]\n\n[bar]: /url \"title\"",
    //     "html": "<p>[foo] <a href=\"/url\" title=\"title\">bar</a></p>"
    // },
    "552": {
        "markdown": "[foo]\n[bar]\n\n[bar]: /url \"title\"",
        "html": "<p>[foo]<a href=\"/url\" title=\"title\">bar</a></p>"
    },
    // "553": {//TODO
    //     "markdown": "[foo]: /url1\n\n[foo]: /url2\n\n[bar][foo]",
    //     "html": "<p><a href=\"/url1\">bar</a></p>"
    // },
    // "554": {
    //     "markdown": "[bar][foo\\!]\n\n[foo!]: /url",
    //     "html": "<p>[bar][foo!]</p>"
    // },
    // "555": {
    //     "markdown": "[foo][ref[]\n\n[ref[]: /uri",
    //     "html": "<p>[foo][ref[]</p><p>[ref[]: /uri</p>"
    // },
    // "556": {
    //     "markdown": "[foo][ref[bar]]\n\n[ref[bar]]: /uri",
    //     "html": "<p>[foo][ref[bar]]</p><p>[ref[bar]]: /uri</p>"
    // },
    // "557": {
    //     "markdown": "[[[foo]]]\n\n[[[foo]]]: /url",
    //     "html": "<p>[[[foo]]]</p><p>[[[foo]]]: /url</p>"
    // },
    // "558": {
    //     "markdown": "[foo][ref\\[]\n\n[ref\\[]: /uri",
    //     "html": "<p><a href=\"/uri\">foo</a></p>"
    // },
    "559": {
        "markdown": "[bar\\\\]: /uri\n\n[bar\\\\]",
        "html": "<p><a href=\"/uri\">bar\\</a></p>"
    },
    "560": {
        "markdown": "[]\n\n[]: /uri",
        "html": "<p>[]</p><p>[]: /uri</p>"
    },
    "561": {
        "markdown": "[\n ]\n\n[\n ]: /uri",
        "html": "<p>[\n]</p><p>[\n]: /uri</p>"
    },
    // "562": {//TODO
    //     "markdown": "[foo][]\n\n[foo]: /url \"title\"",
    //     "html": "<p><a href=\"/url\" title=\"title\">foo</a></p>"
    // },
    // "563": {
    //     "markdown": "[*foo* bar][]\n\n[*foo* bar]: /url \"title\"",
    //     "html": "<p><a href=\"/url\" title=\"title\"><em>foo</em> bar</a></p>"
    // },
    // "564": {
    //     "markdown": "[Foo][]\n\n[foo]: /url \"title\"",
    //     "html": "<p><a href=\"/url\" title=\"title\">Foo</a></p>"
    // },
    "565": {
        "markdown": "[foo] \n[]\n\n[foo]: /url \"title\"",
        "html": "<p><a href=\"/url\" title=\"title\">foo</a>\n[]</p>"
    },
    "566": {
        "markdown": "[foo]\n\n[foo]: /url \"title\"",
        "html": "<p><a href=\"/url\" title=\"title\">foo</a></p>"
    },
    "567": {
        "markdown": "[*foo* bar]\n\n[*foo* bar]: /url \"title\"",
        "html": "<p><a href=\"/url\" title=\"title\"><em>foo</em> bar</a></p>"
    },
    // "568": {//TODO
    //     "markdown": "[[*foo* bar]]\n\n[*foo* bar]: /url \"title\"",
    //     "html": "<p>[<a href=\"/url\" title=\"title\"><em>foo</em> bar</a>]</p>"
    // },
    // "569": {
    //     "markdown": "[[bar [foo]\n\n[foo]: /url",
    //     "html": "<p>[[bar <a href=\"/url\">foo</a></p>"
    // },
    "570": {
        "markdown": "[Foo]\n\n[foo]: /url \"title\"",
        "html": "<p><a href=\"/url\" title=\"title\">Foo</a></p>"
    },
    "571": {
        "markdown": "[foo] bar\n\n[foo]: /url",
        "html": "<p><a href=\"/url\">foo</a> bar</p>"
    },
    "572": {
        "markdown": "\\[foo]\n\n[foo]: /url \"title\"",
        "html": "<p>[foo]</p>"
    },
    // "573": {//TODO
    //     "markdown": "[foo*]: /url\n\n*[foo*]",
    //     "html": "<p>*<a href=\"/url\">foo*</a></p>"
    // },
    // "574": {
    //     "markdown": "[foo][bar]\n\n[foo]: /url1\n[bar]: /url2",
    //     "html": "<p><a href=\"/url2\">foo</a></p>"
    // },
    // "575": {
    //     "markdown": "[foo][]\n\n[foo]: /url1",
    //     "html": "<p><a href=\"/url1\">foo</a></p>"
    // },
    "576": {
        "markdown": "[foo]()\n\n[foo]: /url1",
        "html": "<p><a href=\"\">foo</a></p>"
    },
    // "577": {//TODO
    //     "markdown": "[foo](not a link)\n\n[foo]: /url1",
    //     "html": "<p><a href=\"/url1\">foo</a>(not a link)</p>"
    // },
    // "578": {
    //     "markdown": "[foo][bar][baz]\n\n[baz]: /url",
    //     "html": "<p>[foo]<a href=\"/url\">bar</a></p>"
    // },
    // "579": {
    //     "markdown": "[foo][bar][baz]\n\n[baz]: /url1\n[bar]: /url2",
    //     "html": "<p><a href=\"/url2\">foo</a><a href=\"/url1\">baz</a></p>"
    // },
    // "580": {
    //     "markdown": "[foo][bar][baz]\n\n[baz]: /url1\n[foo]: /url2",
    //     "html": "<p>[foo]<a href=\"/url1\">bar</a></p>"
    // },
    "581": {
        "markdown": "![foo](/url \"title\")",
        "html": "<p><img src=\"/url\" alt=\"foo\" title=\"title\" /></p>"
    },
    // "582": {//TODO
    //     "markdown": "![foo *bar*]\n\n[foo *bar*]: train.jpg \"train & tracks\"",
    //     "html": "<p><img src=\"train.jpg\" alt=\"foo bar\" title=\"train &amp; tracks\" /></p>"
    // },
    // "583": {
    //     "markdown": "![foo ![bar](/url)](/url2)",
    //     "html": "<p><img src=\"/url2\" alt=\"foo bar\" /></p>"
    // },
    // "584": {
    //     "markdown": "![foo [bar](/url)](/url2)",
    //     "html": "<p><img src=\"/url2\" alt=\"foo bar\" /></p>"
    // },
    // "585": {
    //     "markdown": "![foo *bar*][]\n\n[foo *bar*]: train.jpg \"train & tracks\"",
    //     "html": "<p><img src=\"train.jpg\" alt=\"foo bar\" title=\"train &amp; tracks\" /></p>"
    // },
    // "586": {
    //     "markdown": "![foo *bar*][foobar]\n\n[FOOBAR]: train.jpg \"train & tracks\"",
    //     "html": "<p><img src=\"train.jpg\" alt=\"foo bar\" title=\"train &amp; tracks\" /></p>"
    // },
    "587": {
        "markdown": "![foo](train.jpg)",
        "html": "<p><img src=\"train.jpg\" alt=\"foo\" /></p>"
    },
    // "588": {//TODO
    //     "markdown": "My ![foo bar](/path/to/train.jpg  \"title\"   )",
    //     "html": "<p>My <img src=\"/path/to/train.jpg\" alt=\"foo bar\" title=\"title\" /></p>"
    // },
    "589": {
        "markdown": "![foo](<url>)",
        "html": "<p><img src=\"url\" alt=\"foo\" /></p>"
    },
    // "590": {//TODO
    //     "markdown": "![](/url)",
    //     "html": "<p><img src=\"/url\" alt=\"\" /></p>"
    // },
    // "591": {
    //     "markdown": "![foo][bar]\n\n[bar]: /url",
    //     "html": "<p><img src=\"/url\" alt=\"foo\" /></p>"
    // },
    // "592": {
    //     "markdown": "![foo][bar]\n\n[BAR]: /url",
    //     "html": "<p><img src=\"/url\" alt=\"foo\" /></p>"
    // },
    // "593": {
    //     "markdown": "![foo][]\n\n[foo]: /url \"title\"",
    //     "html": "<p><img src=\"/url\" alt=\"foo\" title=\"title\" /></p>"
    // },
    // "594": {
    //     "markdown": "![*foo* bar][]\n\n[*foo* bar]: /url \"title\"",
    //     "html": "<p><img src=\"/url\" alt=\"foo bar\" title=\"title\" /></p>"
    // },
    // "595": {
    //     "markdown": "![Foo][]\n\n[foo]: /url \"title\"",
    //     "html": "<p><img src=\"/url\" alt=\"Foo\" title=\"title\" /></p>"
    // },
    // "596": {
    //     "markdown": "![foo] \n[]\n\n[foo]: /url \"title\"",
    //     "html": "<p><img src=\"/url\" alt=\"foo\" title=\"title\" />\n[]</p>"
    // },
    "597": {
        "markdown": "![foo]\n\n[foo]: /url \"title\"",
        "html": "<p><img src=\"/url\" alt=\"foo\" title=\"title\" /></p>"
    },
    // "598": {//TODO
    //     "markdown": "![*foo* bar]\n\n[*foo* bar]: /url \"title\"",
    //     "html": "<p><img src=\"/url\" alt=\"foo bar\" title=\"title\" /></p>"
    // },
    // "599": {
    //     "markdown": "![[foo]]\n\n[[foo]]: /url \"title\"",
    //     "html": "<p>![[foo]]</p><p>[[foo]]: /url &quot;title&quot;</p>"
    // },
    "600": {
        "markdown": "![Foo]\n\n[foo]: /url \"title\"",
        "html": "<p><img src=\"/url\" alt=\"Foo\" title=\"title\" /></p>"
    },
    "601": {
        "markdown": "!\\[foo]\n\n[foo]: /url \"title\"",
        "html": "<p>![foo]</p>"
    },
    "602": {
        "markdown": "\\![foo]\n\n[foo]: /url \"title\"",
        "html": "<p>!<a href=\"/url\" title=\"title\">foo</a></p>"
    },
    "603": {
        "markdown": "<http://foo.bar.baz>",
        "html": "<p><a href=\"http://foo.bar.baz\">http://foo.bar.baz</a></p>"
    },
    // "604": {//TODO html escapes
    //     "markdown": "<http://foo.bar.baz/test?q=hello&id=22&boolean>",
    //     "html": "<p><a href=\"http://foo.bar.baz/test?q=hello&amp;id=22&amp;boolean\">http://foo.bar.baz/test?q=hello&amp;id=22&amp;boolean</a></p>"
    // },
    "605": {
        "markdown": "<irc://foo.bar:2233/baz>",
        "html": "<p><a href=\"irc://foo.bar:2233/baz\">irc://foo.bar:2233/baz</a></p>"
    },
    "606": {
        "markdown": "<MAILTO:FOO@BAR.BAZ>",
        "html": "<p><a href=\"MAILTO:FOO@BAR.BAZ\">MAILTO:FOO@BAR.BAZ</a></p>"
    },
    "607": {
        "markdown": "<a+b+c:d>",
        "html": "<p><a href=\"a+b+c:d\">a+b+c:d</a></p>"
    },
    "608": {
        "markdown": "<made-up-scheme://foo,bar>",
        "html": "<p><a href=\"made-up-scheme://foo,bar\">made-up-scheme://foo,bar</a></p>"
    },
    "609": {
        "markdown": "<http://../>",
        "html": "<p><a href=\"http://../\">http://../</a></p>"
    },
    "610": {
        "markdown": "<localhost:5001/foo>",
        "html": "<p><a href=\"localhost:5001/foo\">localhost:5001/foo</a></p>"
    },
    // "611": {//TODO invalid link
    //     "markdown": "<http://foo.bar/baz bim>",
    //     "html": "<p>&lt;http://foo.bar/baz bim&gt;</p>"
    // },
    "612": {
        "markdown": "<http://example.com/\\[\\>",
        "html": "<p><a href=\"http://example.com/%5C%5B%5C\">http://example.com/\\[\\</a></p>"
    },
    "613": {
        "markdown": "<foo@bar.example.com>",
        "html": "<p><a href=\"mailto:foo@bar.example.com\">foo@bar.example.com</a></p>"
    },
    // "614": {//TODO wrong token, should be url
    //     "markdown": "<foo+special@Bar.baz-bar0.com>",
    //     "html": "<p><a href=\"mailto:foo+special@Bar.baz-bar0.com\">foo+special@Bar.baz-bar0.com</a></p>"
    // },
    // "615": {//TODO invalid link
    //     "markdown": "<foo\\+@bar.example.com>",
    //     "html": "<p>&lt;foo+@bar.example.com&gt;</p>"
    // },
    "616": {
        "markdown": "<>",
        "html": "<p>&lt;&gt;</p>"
    },
    // "617": {//TODO not autolink
    //     "markdown": "< http://foo.bar >",
    //     "html": "<p>&lt; http://foo.bar &gt;</p>"
    // },
    // "618": {//TODO invalid link
    //     "markdown": "<m:abc>",
    //     "html": "<p>&lt;m:abc&gt;</p>"
    // },
    // "619": {
    //     "markdown": "<foo.bar.baz>",
    //     "html": "<p>&lt;foo.bar.baz&gt;</p>"
    // },
    // "620": {//TODO not autolink
    //     "markdown": "http://example.com",
    //     "html": "<p>http://example.com</p>"
    // },
    // "621": {//TODO not autolink
    //     "markdown": "foo@bar.example.com",
    //     "html": "<p>foo@bar.example.com</p>"
    // },
    // "622": {//TODO autolinks extension
    //     "markdown": "www.commonmark.org",
    //     "html": "<p><a href=\"http://www.commonmark.org\">www.commonmark.org</a></p>"
    // },
    // "623": {
    //     "markdown": "Visit www.commonmark.org/help for more information.",
    //     "html": "<p>Visit <a href=\"http://www.commonmark.org/help\">www.commonmark.org/help</a> for more information.</p>"
    // },
    // "624": {
    //     "markdown": "Visit www.commonmark.org.\n\nVisit www.commonmark.org/a.b.",
    //     "html": "<p>Visit <a href=\"http://www.commonmark.org\">www.commonmark.org</a>.</p><p>Visit <a href=\"http://www.commonmark.org/a.b\">www.commonmark.org/a.b</a>.</p>"
    // },
    // "625": {
    //     "markdown": "www.google.com/search?q=Markup+(business)\n\nwww.google.com/search?q=Markup+(business)))\n\n(www.google.com/search?q=Markup+(business))\n\n(www.google.com/search?q=Markup+(business)",
    //     "html": "<p><a href=\"http://www.google.com/search?q=Markup+(business)\">www.google.com/search?q=Markup+(business)</a></p><p><a href=\"http://www.google.com/search?q=Markup+(business)\">www.google.com/search?q=Markup+(business)</a>))</p><p>(<a href=\"http://www.google.com/search?q=Markup+(business)\">www.google.com/search?q=Markup+(business)</a>)</p><p>(<a href=\"http://www.google.com/search?q=Markup+(business)\">www.google.com/search?q=Markup+(business)</a></p>"
    // },
    // "626": {
    //     "markdown": "www.google.com/search?q=(business))+ok",
    //     "html": "<p><a href=\"http://www.google.com/search?q=(business))+ok\">www.google.com/search?q=(business))+ok</a></p>"
    // },
    // "627": {
    //     "markdown": "www.google.com/search?q=commonmark&hl=en\n\nwww.google.com/search?q=commonmark&hl;",
    //     "html": "<p><a href=\"http://www.google.com/search?q=commonmark&amp;hl=en\">www.google.com/search?q=commonmark&amp;hl=en</a></p><p><a href=\"http://www.google.com/search?q=commonmark\">www.google.com/search?q=commonmark</a>&amp;hl;</p>"
    // },
    // "628": {
    //     "markdown": "www.commonmark.org/he<lp",
    //     "html": "<p><a href=\"http://www.commonmark.org/he\">www.commonmark.org/he</a>&lt;lp</p>"
    // },
    // "629": {
    //     "markdown": "http://commonmark.org\n\n(Visit https://encrypted.google.com/search?q=Markup+(business))",
    //     "html": "<p><a href=\"http://commonmark.org\">http://commonmark.org</a></p><p>(Visit <a href=\"https://encrypted.google.com/search?q=Markup+(business)\">https://encrypted.google.com/search?q=Markup+(business)</a>)</p>"
    // },
    // "630": {
    //     "markdown": "foo@bar.baz",
    //     "html": "<p><a href=\"mailto:foo@bar.baz\">foo@bar.baz</a></p>"
    // },
    // "631": {
    //     "markdown": "hello@mail+xyz.example isn't valid, but hello+xyz@mail.example is.",
    //     "html": "<p>hello@mail+xyz.example isn't valid, but <a href=\"mailto:hello+xyz@mail.example\">hello+xyz@mail.example</a> is.</p>"
    // },
    // "632": {
    //     "markdown": "a.b-c_d@a.b\n\na.b-c_d@a.b.\n\na.b-c_d@a.b-\n\na.b-c_d@a.b_",
    //     "html": "<p><a href=\"mailto:a.b-c_d@a.b\">a.b-c_d@a.b</a></p><p><a href=\"mailto:a.b-c_d@a.b\">a.b-c_d@a.b</a>.</p><p>a.b-c_d@a.b-</p><p>a.b-c_d@a.b_</p>"
    // },
    // "633": {
    //     "markdown": "mailto:foo@bar.baz\n\nmailto:a.b-c_d@a.b\n\nmailto:a.b-c_d@a.b.\n\nmailto:a.b-c_d@a.b/\n\nmailto:a.b-c_d@a.b-\n\nmailto:a.b-c_d@a.b_\n\nxmpp:foo@bar.baz\n\nxmpp:foo@bar.baz.",
    //     "html": "<p><a href=\"mailto:foo@bar.baz\">mailto:foo@bar.baz</a></p><p><a href=\"mailto:a.b-c_d@a.b\">mailto:a.b-c_d@a.b</a></p><p><a href=\"mailto:a.b-c_d@a.b\">mailto:a.b-c_d@a.b</a>.</p><p><a href=\"mailto:a.b-c_d@a.b\">mailto:a.b-c_d@a.b</a>/</p><p>mailto:a.b-c_d@a.b-</p><p>mailto:a.b-c_d@a.b_</p><p><a href=\"xmpp:foo@bar.baz\">xmpp:foo@bar.baz</a></p><p><a href=\"xmpp:foo@bar.baz\">xmpp:foo@bar.baz</a>.</p>"
    // },
    // "634": {
    //     "markdown": "xmpp:foo@bar.baz/txt\n\nxmpp:foo@bar.baz/txt@bin\n\nxmpp:foo@bar.baz/txt@bin.com",
    //     "html": "<p><a href=\"xmpp:foo@bar.baz/txt\">xmpp:foo@bar.baz/txt</a></p><p><a href=\"xmpp:foo@bar.baz/txt@bin\">xmpp:foo@bar.baz/txt@bin</a></p><p><a href=\"xmpp:foo@bar.baz/txt@bin.com\">xmpp:foo@bar.baz/txt@bin.com</a></p>"
    // },
    // "635": {
    //     "markdown": "xmpp:foo@bar.baz/txt/bin",
    //     "html": "<p><a href=\"xmpp:foo@bar.baz/txt\">xmpp:foo@bar.baz/txt</a>/bin</p>"
    // },
    // "636": {//TODO raw html
    //     "markdown": "<a><bab><c2c>",
    //     "html": "<p><a><bab><c2c></p>"
    // },
    // "637": {
    //     "markdown": "<a/><b2/>",
    //     "html": "<p><a/><b2/></p>"
    // },
    // "638": {
    //     "markdown": "<a  /><b2\ndata=\"foo\" >",
    //     "html": "<p><a  /><b2\ndata=\"foo\" ></p>"
    // },
    // "639": {
    //     "markdown": "<a foo=\"bar\" bam = 'baz <em>\"</em>'\n_boolean zoop:33=zoop:33 />",
    //     "html": "<p><a foo=\"bar\" bam = 'baz <em>\"</em>'\n_boolean zoop:33=zoop:33 /></p>"
    // },
    "640": {
        "markdown": "Foo <responsive-image src=\"foo.jpg\" />",
        "html": "<p>Foo <responsive-image src=\"foo.jpg\" /></p>"
    },
    // "641": {//TODO
    //     "markdown": "<33> <__>",
    //     "html": "<p>&lt;33&gt; &lt;__&gt;</p>"
    // },
    // "642": {
    //     "markdown": "<a h*#ref=\"hi\">",
    //     "html": "<p>&lt;a h*#ref=&quot;hi&quot;&gt;</p>"
    // },
    // "643": {
    //     "markdown": "<a href=\"hi'> <a href=hi'>",
    //     "html": "<p>&lt;a href=&quot;hi'&gt; &lt;a href=hi'&gt;</p>"
    // },
    // "644": {
    //     "markdown": "< a><\nfoo><bar/ ><foo bar=baz\nbim!bop />",
    //     "html": "<p>&lt; a&gt;&lt;\nfoo&gt;&lt;bar/ &gt;\n&lt;foo bar=baz\nbim!bop /&gt;</p>"
    // },
    // "645": {
    //     "markdown": "<a href='bar'title=title>",
    //     "html": "<p>&lt;a href='bar'title=title&gt;</p>"
    // },
    // "646": {
    //     "markdown": "</a></foo >",
    //     "html": "<p></a></foo ></p>"
    // },
    // "647": {
    //     "markdown": "</a href=\"foo\">",
    //     "html": "<p>&lt;/a href=&quot;foo&quot;&gt;</p>"
    // },
    // "648": {
    //     "markdown": "foo <!-- this is a\ncomment - with hyphen -->",
    //     "html": "<p>foo <!-- this is a\ncomment - with hyphen --></p>"
    // },
    // "649": {
    //     "markdown": "foo <!-- not a comment -- two hyphens -->",
    //     "html": "<p>foo &lt;!-- not a comment -- two hyphens --&gt;</p>"
    // },
    // "650": {
    //     "markdown": "foo <!--> foo -->\n\nfoo <!-- foo--->",
    //     "html": "<p>foo &lt;!--&gt; foo --&gt;</p><p>foo &lt;!-- foo---&gt;</p>"
    // },
    "651": {
        "markdown": "foo <?php echo $a; ?>",
        "html": "<p>foo <?php echo $a; ?></p>"
    },
    // "652": {//TODO
    //     "markdown": "foo <!ELEMENT br EMPTY>",
    //     "html": "<p>foo <!ELEMENT br EMPTY></p>"
    // },
    // "653": {
    //     "markdown": "foo <![CDATA[>&<]]>",
    //     "html": "<p>foo <![CDATA[>&<]]></p>"
    // },
    // "654": {
    //     "markdown": "foo <a href=\"&ouml;\">",
    //     "html": "<p>foo <a href=\"&ouml;\"></p>"
    // },
    "655": {
        "markdown": "foo <a href=\"\\*\">",
        "html": "<p>foo <a href=\"\\*\"></p>"
    },
    // "656": {//TODO
    //     "markdown": "<a href=\"\\\"\">",
    //     "html": "<p>&lt;a href=&quot;&quot;&quot;&gt;</p>"
    // },
    // "657": {
    //     "markdown": "<strong> <title> <style> <em>\n<blockquote>\n  <xmp> is disallowed.  <XMP> is also disallowed.</blockquote>",
    //     "html": "<p><strong> &lt;title> &lt;style> <em></p><blockquote>\n  &lt;xmp> is disallowed.  &lt;XMP> is also disallowed.</blockquote>"
    // },
    "658": {
        "markdown": "foo  \nbaz",
        "html": "<p>foo<br />\nbaz</p>"
    },
    "659": {
        "markdown": "foo\\\nbaz",
        "html": "<p>foo<br />\nbaz</p>"
    },
    "660": {
        "markdown": "foo       \nbaz",
        "html": "<p>foo<br />\nbaz</p>"
    },
    "661": {
        "markdown": "foo  \n     bar",
        "html": "<p>foo<br />\nbar</p>"
    },
    "662": {
        "markdown": "foo\\\n     bar",
        "html": "<p>foo<br />\nbar</p>"
    },
    "663": {
        "markdown": "*foo  \nbar*",
        "html": "<p><em>foo<br />\nbar</em></p>"
    },
    "664": {
        "markdown": "*foo\\\nbar*",
        "html": "<p><em>foo<br />\nbar</em></p>"
    },
    "665": {
        "markdown": "`code  \nspan`",
        "html": "<p><code>code   span</code></p>"
    },
    "666": {
        "markdown": "`code\\\nspan`",
        "html": "<p><code>code\\ span</code></p>"
    },
    // "667": {//TODO raw html
    //     "markdown": "<a href=\"foo  \nbar\">",
    //     "html": "<p><a href=\"foo  \nbar\"></p>"
    // },
    // "668": {
    //     "markdown": "<a href=\"foo\\\nbar\">",
    //     "html": "<p><a href=\"foo\\\nbar\"></p>"
    // },
    "669": {
        "markdown": "foo\\",
        "html": "<p>foo\\</p>"
    },
    "670": {
        "markdown": "foo  ",
        "html": "<p>foo</p>"
    },
    "671": {
        "markdown": "### foo\\",
        "html": "<h3>foo\\</h3>"
    },
    "672": {
        "markdown": "### foo  ",
        "html": "<h3>foo</h3>"
    },
    "673": {
        "markdown": "foo\nbaz",
        "html": "<p>foo\nbaz</p>"
    },
    "674": {
        "markdown": "foo \n baz",
        "html": "<p>foo\nbaz</p>"
    },
    "675": {
        "markdown": "hello $.;'there",
        "html": "<p>hello $.;'there</p>"
    },
    "676": {
        "markdown": "Foo χρῆν",
        "html": "<p>Foo χρῆν</p>"
    },
    "677": {
        "markdown": "Multiple     spaces",
        "html": "<p>Multiple     spaces</p>"
    }
}

var startFrom = 0;
var upTo = Infinity;

var resultHtml = dom.buildDom(["div"]);
var markdownRenderer = new MarkdownRenderer(resultHtml);

module.exports = Object.fromEntries(Object.entries(commonmarkJson).map(([index, json]) => {
    if (index < startFrom || index > upTo)
        return [];
    var markdown = json.markdown;
    var expected = document.createElement();
    expected.innerHTML = json.html;

    var key = `test: example ${index}: "${markdown.replaceAll("\n", "\\n")}"`;

    return [key, function () {
        markdownRenderer.render(markdown);
        var res = resultHtml.innerHTML;
        res = res.replaceAll(`\\n`, `\n`);//TODO?
        res = res.replaceAll(`\\\\`, `\\`);//TODO?
        resultHtml.innerHTML = res;
        assert.equal(resultHtml.innerHTML.toString(), expected.innerHTML.toString());
    }]
}));

if (typeof module !== "undefined" && module === require.main) {
    require("asyncjs").test.testcase(module.exports).exec();
}