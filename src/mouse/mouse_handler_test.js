if (typeof process !== "undefined") {
    require("../test/mockdom");
}
"use strict";

require("../multi_select");
require("../theme/textmate");
var Editor = require("../editor").Editor;
var Mode = require("../mode/java").Mode;
var VirtualRenderer = require("../virtual_renderer").VirtualRenderer;
var assert = require("../test/assertions");
var MouseEvent = function(type, opts){
    var e = document.createEvent("MouseEvents");
    e.initMouseEvent(/click|DOM/.test(type) ? type : "mouse" + type,
        true, true, window,
        opts.detail,
        opts.x, opts.y, opts.x, opts.y,
        opts.ctrl, opts.alt, opts.shift, opts.meta,
        opts.button || 0, opts.relatedTarget);
    return e;
};

module.exports = {

    setUp : function(next) {
        this.editor = new Editor(new VirtualRenderer());
        this.editor.session.setValue("Juhu kinners!");
        this.editor.container.style.position = "absolute";
        this.editor.container.style.height = "500px";
        this.editor.container.style.width = "500px";
        this.editor.container.style.left = "50px";
        this.editor.container.style.top = "10px";
        document.body.appendChild(this.editor.container);
        next();
    },

    "test: double tap. issue #956" : function() {
        // mouse up fired immediately after mouse down
        this.editor.resize(true);
        var pos = this.editor.renderer.textToScreenCoordinates(0, 1);
        var target = this.editor.renderer.getMouseEventTarget();
        target.dispatchEvent(MouseEvent("down", {x: pos.pageX, y: pos.pageY}));
        target.dispatchEvent(MouseEvent("up", {x: pos.pageX, y: pos.pageY}));
        target.dispatchEvent(MouseEvent("down", {x: pos.pageX, y: pos.pageY, detail: 2}));
        target.dispatchEvent(MouseEvent("up", {x: pos.pageX, y: pos.pageY, detail: 2}));
        
        assert.equal(this.editor.getSelectedText(), "Juhu");
        
        target.dispatchEvent(MouseEvent("down", {x: pos.pageX, y: pos.pageY}));
        target.dispatchEvent(MouseEvent("up", {x: pos.pageX, y: pos.pageY}));
        assert.equal(this.editor.getSelectedText(), "");
    },
    "test: multiselect" : function() {
        var target = this.editor.renderer.getMouseEventTarget();
        this.editor.session.setValue("xyz\n\nabc efg");
        this.editor.resize(true);
        
        var pos = this.editor.renderer.textToScreenCoordinates(0, 1);
        
        target.dispatchEvent(MouseEvent("down", {x: pos.pageX, y: pos.pageY}));
        target.dispatchEvent(MouseEvent("up", {x: pos.pageX, y: pos.pageY}));
        
        pos = this.editor.renderer.textToScreenCoordinates(0, 2);
        
        target.dispatchEvent(MouseEvent("down", {x: pos.pageX, y: pos.pageY, ctrl: true}));
        target.dispatchEvent(MouseEvent("up", {x: pos.pageX, y: pos.pageY}));
        
        var selection = "Range: [0/2] -> [0/2],Range: [0/1] -> [0/1]";
        assert.equal(this.editor.selection.toJSON() + "", selection);
        
        pos = this.editor.renderer.textToScreenCoordinates(2, 2);
        
        target.dispatchEvent(MouseEvent("down", {x: pos.pageX, y: pos.pageY, detail: 2, ctrl: true}));
        target.dispatchEvent(MouseEvent("up", {x: pos.pageX, y: pos.pageY, detail: 2, ctrl: true}));
        
        selection = "Range: [2/0] -> [2/3]," + selection;
        assert.equal(this.editor.selection.toJSON() + "", selection);
        
        var pos = this.editor.renderer.textToScreenCoordinates(0, 1);
        
        target.dispatchEvent(MouseEvent("down", {x: pos.pageX, y: pos.pageY, ctrl: true}));
        target.dispatchEvent(MouseEvent("up", {x: pos.pageX, y: pos.pageY, ctrl: true}));
        selection = selection.split(",").slice(0, -1).join(",");
        assert.equal(this.editor.selection.toJSON() + "", selection);
        
        var pos1 = this.editor.renderer.textToScreenCoordinates(0, 2);
        var pos2 = this.editor.renderer.textToScreenCoordinates(2, 2);
        
        target.dispatchEvent(MouseEvent("down", {x: pos1.pageX, y: pos1.pageY, alt: true}));
        target.dispatchEvent(MouseEvent("move", {x: pos2.pageX, y: pos2.pageY + 1, alt: true}));
        target.dispatchEvent(MouseEvent("up", {x: pos2.pageX, y: pos2.pageY + 1, alt: true}));
        assert.equal(this.editor.selection.toJSON() + "", "Range: [2/2] -> [2/2],Range: [1/0] -> [1/0],Range: [0/2] -> [0/2]");
    },
    "test: gutter" : function() {
        var editor = this.editor;
        var value = "x {" + "\n".repeat(50) + "}";
        value = value.repeat(50);
        editor.session.setMode(new Mode());
        editor.setValue(value, -1);
        editor.renderer.$loop._flush();
        var lines = editor.renderer.$gutterLayer.$lines;
        var toggler = lines.cells[0].element.lastChild;
        var rect = toggler.getBoundingClientRect();
        if (!rect.left) rect.left = 100; // for mockdom
        toggler.dispatchEvent(MouseEvent("down", {x: rect.left, y: rect.top}));
        toggler.dispatchEvent(MouseEvent("up", {x: rect.left, y: rect.top}));
        toggler.dispatchEvent(MouseEvent("click", {x: rect.left, y: rect.top}));
        editor.renderer.$loop._flush();
        
        assert.ok(/ace_gutter-active-line/.test(lines.cells[0].element.className));
        assert.ok(/ace_closed/.test(toggler.className));
        editor.execCommand("golinedown");
        editor.renderer.$loop._flush();
        assert.notOk(/ace_gutter-active-line/.test(lines.cells[0].element.className));
        assert.ok(/ace_gutter-active-line/.test(lines.cells[1].element.className));
        assert.equal(lines.cells[1].element.textContent, "51");
        
        var e;
        if ("onmousewheel" in toggler) {
            e = MouseEvent("wheel", {});
            e.wheelDelta = -500;
        }
        else {
            e = MouseEvent("DOMMouseScroll", {detail: 100});
        }
        toggler.dispatchEvent(e);
        editor.renderer.$loop._flush();
        assert.ok(parseInt(lines.cells[0].element.textContent) > 1);
    },
    
    tearDown : function() {
        document.body.removeChild(this.editor.container);
    }
};
if (typeof module !== "undefined" && module === require.main) {
    require("asyncjs").test.testcase(module.exports).exec();
}
