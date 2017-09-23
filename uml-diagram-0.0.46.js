(function(){

function _(tag,attrs) {
    var ns = ("xmlns" in (attrs || {}));
    var result = ns?
        document.createElementNS(attrs["xmlns"],tag):
        document.createElement(tag);
    if(attrs) {
        Object.keys(attrs).forEach(function(attr) {
            if(("xmlns" != attr) || ("svg" == tag)) {
                result.setAttribute(attr, attrs[attr]);
            }
        });
    }
    return result;
}

var slugify = (function() {
    var one  = 'ąàáäâãåæăćčĉęèéëêĝĥìíïîĵłľńňòóöőôõðøśșşšŝťțţŭùúüűûñÿýçżźž',
        two  = 'aaaaaaaaaccceeeeeghiiiijllnnoooooooossssstttuuuuuunyyczzz';
    one += one.toUpperCase();
    two += two.toUpperCase();
    return function(o) {
        var txt = ""+(o || "");
        return txt.replace(/.{1}/g,function(c){
                var i = one.indexOf(c);
                return (i==-1)?c:two[i];
            })
            .replace(/[^\w-]/g, '-')
            .replace(/^-+/, '')
            .replace(/-+$/, '')
            .replace(/--+/g, '-')
            ;
    };
})();

function idOrNewId(element) {
    if(!(element.id)) {
        var base = slugify(element.name || element.textContent).toLowerCase();
        var n = 0;
        var id = base || ((base="_") + (++n));
        while(document.querySelector("#"+id)) {
            id = base+(++n);
        }
        element.setAttribute("id", id);
    }
    return element.id;
}

function draggableInParent(self,originalParent) {
    self.addEventListener("mousedown", function(event) {
        var parent = originalParent || self.diagram || self.parentNode;
        var foo = parent.startDrag;
        if(foo) {
            foo.bind(parent)(event, self);
            event.preventDefault();
        }
    });
};

function menu(event, items, callback, options) {
    options = options || {};
    items = (items || "...").split(/,+/g);
    var selector = _("div", {"class":"uml-floating-menu"});
    items.forEach(function(item) {
        var d = _("div", {"class":"uml-menu-item"});
        d.textContent = item;
        selector.appendChild(d);
    });
    selector.style.left = event.pageX+"px";
    selector.style.top = event.pageY+"px";
    var container = document.body;
    container.appendChild(selector);
    function singleclick(ev2) {
        if(ev2.target.parentNode == selector) {
            callback(ev2.target.textContent, 
                options.originalEvent?event:ev2);
        }
        selector.parentNode.removeChild(selector);
        container.removeEventListener("mousedown", singleclick);
    };
    container.addEventListener("mousedown", singleclick);
};

function elementsFromPoint(x,y) {
    var stack = [];
    var restores = [];
    var current = document.elementFromPoint(
            x-(document.body.scrollLeft || document.documentElement.scrollLeft),
            y-(document.body.scrollTop || document.documentElement.scrollTop)
        );
    while(current?(document.body != current):false) {
        stack.push(current);
        restores.push({
            element:current,
            value: current.style.getPropertyValue('pointer-events'),
            priority: current.style.getPropertyPriority('pointer-events'),
        });
		current.style.setProperty('pointer-events', 'none', 'important'); 
        current = document.elementFromPoint(
            x-(document.body.scrollLeft || document.documentElement.scrollLeft),
            y-(document.body.scrollTop || document.documentElement.scrollTop)
        );
    }
    restores.forEach(function(r) {
		r.element.style.setProperty('pointer-events', 
                r.value || '', r.priority); 
    });
    return stack;
}

var sizeGetters = {
    pageX:{
        get:function(){
            var result = 0;
            var node = this;
            while(node) {
                result += +(node.offsetLeft || 0);
                node = node.offsetParent;
            }
            return result;
        }
    },
    pageY:{
        get:function(){
            var result = 0;
            var node = this;
            while(node) {
                result += +(node.offsetTop || 0);
                node = node.offsetParent;
            }
            return result;
        }
    },
    width:{
        get:function(){
            var cs = getComputedStyle(this);
            var w = cs.width.replace(/px/,"");
            var l = cs.paddingLeft.replace(/px/,"");
            var r = cs.paddingRight.replace(/px/,"");
            return (+w)+(+l)+(+r);
        }
    },
    height:{
        get:function(){
            var cs = getComputedStyle(this);
            var w = cs.height.replace(/px/,"");
            var l = cs.paddingTop.replace(/px/,"");
            var r = cs.paddingBottom.replace(/px/,"");
            return (+w)+(+l)+(+r);
        }
    },
};

var UmlLinkPrototype = Object.create(HTMLDivElement.prototype,{
    svg:{get:function() {
        return this.querySelector("svg") ||
               this.appendChild(_("svg",{
                "xmlns": "http://www.w3.org/2000/svg", version:"1.1", 
                "xmlns:xlink": "http://www.w3.org/1999/xlink",
                "style":"display:block",
                }));
    }},
    defaultTitle:{value:""},
});
UmlLinkPrototype.update = function() {
    if(this.getAttribute("linktype") == "arrowed") {
        this.updateArrowed();
    } else if(this.getAttribute("linktype") == "dashed") {
        this.updateDashed();
    } else if(this.getAttribute("linktype") == "dashedarrow") {
        this.updateDashedArrow();
    } else if(this.getAttribute("linktype") == "dashedemptyarrow") {
        this.updateDashedEmptyArrow();
    } else if(this.getAttribute("linktype") == "emptyarrow") {
        this.updateEmptyArrow();
    } else if(this.getAttribute("linktype") == "diamond") {
        this.updateDiamond();
    } else if(this.getAttribute("linktype") == "diamondfull") {
        this.updateDiamondFull();
    } else {
        this.updateStraight();
    }
};
UmlLinkPrototype.updateStraight = function() {
    var from = this.getAttribute("from") || "0,0";
    var to =   this.getAttribute("to") || "0,0";
    var g = this.svg.querySelector("g") || this.svg.appendChild(
            _("g",{ "xmlns": "http://www.w3.org/2000/svg", }));
    var line = g.querySelector("line") || g.appendChild(
            _("line",{ "xmlns": "http://www.w3.org/2000/svg",
                    "stroke": "black",
                    "stroke-width": 1,
                    }));
    var ports = getPortsFor(from,to,this.parentNode);
    line.setAttribute("x1", ports.x1);
    line.setAttribute("y1", ports.y1);
    line.setAttribute("x2", ports.x2);
    line.setAttribute("y2", ports.y2);
    var p = this.parentNode;
    if(p) {
        this.svg.setAttribute("width", p.offsetWidth);
        this.svg.setAttribute("height", p.offsetHeight);
    }
};
UmlLinkPrototype.updateDashedArrow = function() {
    this.updateArrowed(true);
};
UmlLinkPrototype.updateDashedEmptyArrow = function() {
    this.updateArrowed(true,true);
};
UmlLinkPrototype.updateEmptyArrow = function() {
    this.updateArrowed(false,true);
};
UmlLinkPrototype.updateArrowed = function(dashed,empty) {
    var from = this.getAttribute("from") || "0,0";
    var to =   this.getAttribute("to") || "0,0";
    var defs = this.svg.querySelector("defs") || this.svg.appendChild(
            _("defs",{ "xmlns": "http://www.w3.org/2000/svg" }));
    var tpath = defs.querySelector("path") || defs.appendChild(
            _("path",{ "xmlns": "http://www.w3.org/2000/svg" }));
    var g = this.svg.querySelector("g") || this.svg.appendChild(
            _("g",{ "xmlns": "http://www.w3.org/2000/svg", }));
    var lineopts = { "xmlns": "http://www.w3.org/2000/svg",
                    "stroke": "black",
                    "stroke-width": 1,
                    };
    if(dashed) {
        lineopts["stroke-dasharray"] = "5,5";
    };
    var line = g.querySelector("line") || g.appendChild(
            _("line",lineopts));
    var path = g.querySelector("path") || g.appendChild(
            _("path",{ "xmlns": "http://www.w3.org/2000/svg",
                    "stroke": "black",
                    "stroke-width": 1,
                    "fill": empty?"none":"white",
                    }));

    var label = g.querySelector("text") || g.appendChild(
            _("text",{ "xmlns": "http://www.w3.org/2000/svg",
                    "fill": "black",
                    "font-family":"Tahoma,Arial,Helvetica,sans-serif",
                    "font-size":"10",
                    "text-anchor":"middle",
                    }));
    var pid = "#"+idOrNewId(tpath);
    var alongPath = label.querySelector("textPath") || label.appendChild(
            _("textPath",{ "xmlns": "http://www.w3.org/2000/svg",
                    "startOffset":"50%",
                }));

    var ports = getPortsFor(from,to,this.parentNode);
    line.setAttribute("x1", ports.x1);
    line.setAttribute("y1", ports.y1);
    line.setAttribute("x2", ports.x2);
    line.setAttribute("y2", ports.y2);

    if(ports.e2) {
        var x12 = ports.x1-ports.x2,
            y12 = ports.y1-ports.y2,
            l = Math.max(1, Math.sqrt(x12*x12+y12*y12)),
            ux = x12/l,
            uy = y12/l,
            L = 8,
            x3 = ports.x2+L*(2*ux+uy),
            x4 = ports.x2+L*(2*ux-uy),
            y3 = ports.y2+L*(2*uy-ux),
            y4 = ports.y2+L*(2*uy+ux)
            ;
        if(empty) {
            path.setAttribute("d", 
                             "M"+x3+" "+y3
                             +" L"+ports.x2+" "+ports.y2
                             +" L"+x4+" "+y4
                            );
        } else {
            path.setAttribute("d", "M"+ports.x2+" "+ports.y2
                             +" L"+x3+" "+y3
                             +" L"+x4+" "+y4
                             +" Z");
        }
    } else {
        path.setAttribute("d", "M0 0");
    }

    if(Math.min(ports.x1,ports.x2)==ports.x1) {
        tpath.setAttribute("d", "M "+ports.x1+" "+ports.y1
                  +" L "+ports.x2+" "+ports.y2);
    } else {
        tpath.setAttribute("d", "M "+ports.x2+" "+ports.y2
                  +" L "+ports.x1+" "+ports.y1);
    }

    var title = this.getAttribute("title") || this.defaultTitle;
    alongPath.textContent = title;
    alongPath.setAttributeNS("http://www.w3.org/1999/xlink",
            "href", pid);

    var p = this.parentNode;
    if(p) {
        this.svg.setAttribute("width", p.offsetWidth);
        this.svg.setAttribute("height", p.offsetHeight);
    }
};
UmlLinkPrototype.updateDashed = function() {
    var from = this.getAttribute("from") || "0,0";
    var to =   this.getAttribute("to") || "0,0";
    var defs = this.svg.querySelector("defs") || this.svg.appendChild(
            _("defs",{ "xmlns": "http://www.w3.org/2000/svg" }));
    var tpath = defs.querySelector("path") || defs.appendChild(
            _("path",{ "xmlns": "http://www.w3.org/2000/svg" }));
    var g = this.svg.querySelector("g") || this.svg.appendChild(
            _("g",{ "xmlns": "http://www.w3.org/2000/svg", }));
    var line = g.querySelector("line") || g.appendChild(
            _("line",{ "xmlns": "http://www.w3.org/2000/svg",
                    "stroke": "black",
                    "stroke-width": 1,
                    "stroke-dasharray": "5,5",
                    }));
    var path = g.querySelector("path") || g.appendChild(
            _("path",{ "xmlns": "http://www.w3.org/2000/svg",
                    "stroke": "black",
                    "stroke-width": 1,
                    "stroke-dasharray": "5,5",
                    "fill": "none",
                    }));
    var label = g.querySelector("text") || g.appendChild(
            _("text",{ "xmlns": "http://www.w3.org/2000/svg",
                    "fill": "black",
                    "font-family":"Tahoma,Arial,Helvetica,sans-serif",
                    "font-size":"10",
                    "text-anchor":"middle",
                    }));
    var pid = "#"+idOrNewId(tpath);
    var alongPath = label.querySelector("textPath") || label.appendChild(
            _("textPath",{ "xmlns": "http://www.w3.org/2000/svg",
                    "startOffset":"50%",
                }));
    var ports = getPortsFor(from,to,this.parentNode);
    line.setAttribute("x1", ports.x1);
    line.setAttribute("y1", ports.y1);
    line.setAttribute("x2", ports.x2);
    line.setAttribute("y2", ports.y2);

    if(ports.e2) {
        var x12 = ports.x1-ports.x2,
            y12 = ports.y1-ports.y2,
            l = Math.max(1, Math.sqrt(x12*x12+y12*y12)),
            ux = x12/l,
            uy = y12/l,
            L = 8,
            x3 = ports.x2+L*(2*ux+uy),
            x4 = ports.x2+L*(2*ux-uy),
            y3 = ports.y2+L*(2*uy-ux),
            y4 = ports.y2+L*(2*uy+ux)
            ;
        var d = "M"+x3+" "+y3
              +" L"+ports.x2+" "+ports.y2
              +" L"+x4+" "+y4;
        path.setAttribute("d", d);
    } else {
        path.setAttribute("d", "M0 0");
    }

    if(Math.min(ports.x1,ports.x2)==ports.x1) {
        tpath.setAttribute("d", "M "+ports.x1+" "+ports.y1
                  +" L "+ports.x2+" "+ports.y2);
    } else {
        tpath.setAttribute("d", "M "+ports.x2+" "+ports.y2
                  +" L "+ports.x1+" "+ports.y1);
    }
    var title = this.getAttribute("title") || this.defaultTitle;
    alongPath.textContent = title;
    alongPath.setAttributeNS("http://www.w3.org/1999/xlink",
            "href", pid);
    var p = this.parentNode;
    if(p) {
        this.svg.setAttribute("width", p.offsetWidth);
        this.svg.setAttribute("height", p.offsetHeight);
    }
};
UmlLinkPrototype.updateDiamondFull = function(full) {
    this.updateDiamond(true);
}
UmlLinkPrototype.updateDiamond = function(full) {
    var from = this.getAttribute("from") || "0,0";
    var to =   this.getAttribute("to") || "0,0";
    var defs = this.svg.querySelector("defs") || this.svg.appendChild(
            _("defs",{ "xmlns": "http://www.w3.org/2000/svg" }));
    var tpath = defs.querySelector("path") || defs.appendChild(
            _("path",{ "xmlns": "http://www.w3.org/2000/svg" }));
    var g = this.svg.querySelector("g") || this.svg.appendChild(
            _("g",{ "xmlns": "http://www.w3.org/2000/svg", }));
    var line = g.querySelector("line") || g.appendChild(
            _("line", { "xmlns": "http://www.w3.org/2000/svg",
                    "stroke": "black",
                    "stroke-width": 1,
                    }));
    var path = g.querySelector("path") || g.appendChild(
            _("path",{ "xmlns": "http://www.w3.org/2000/svg",
                    "stroke": "black",
                    "stroke-width": 1,
                    "fill": full?"black":"white",
                    }));
    var label = g.querySelector("text") || g.appendChild(
            _("text",{ "xmlns": "http://www.w3.org/2000/svg",
                    "fill": "black",
                    "font-family":"Tahoma,Arial,Helvetica,sans-serif",
                    "font-size":"10",
                    "text-anchor":"middle",
                    }));
    var pid = "#"+idOrNewId(tpath);
    var alongPath = label.querySelector("textPath") || label.appendChild(
            _("textPath",{ "xmlns": "http://www.w3.org/2000/svg",
                    "startOffset":"50%",
                }));
    var ports = getPortsFor(to,from,this.parentNode);
    line.setAttribute("x1", ports.x1);
    line.setAttribute("y1", ports.y1);
    line.setAttribute("x2", ports.x2);
    line.setAttribute("y2", ports.y2);

    if(ports.e2) {
        var x12 = ports.x1-ports.x2,
            y12 = ports.y1-ports.y2,
            l = Math.max(1, Math.sqrt(x12*x12+y12*y12)),
            ux = x12/l,
            uy = y12/l,
            L = 5,
            x3 = ports.x2+L*(2*ux+uy),
            x4 = ports.x2+L*(2*ux-uy),
            y3 = ports.y2+L*(2*uy-ux),
            y4 = ports.y2+L*(2*uy+ux)
            x5 = ports.x2+L*4*ux;
            y5 = ports.y2+L*4*uy;
            ;
        path.setAttribute("d", "M"+ports.x2+" "+ports.y2
                             +" L"+x3+" "+y3
                             +" L"+x5+" "+y5
                             +" L"+x4+" "+y4
                             +" Z");
    } else {
        path.setAttribute("d", "M0 0");
    }

    if(Math.min(ports.x1,ports.x2)==ports.x1) {
        tpath.setAttribute("d", "M "+ports.x1+" "+ports.y1
                  +" L "+ports.x2+" "+ports.y2);
    } else {
        tpath.setAttribute("d", "M "+ports.x2+" "+ports.y2
                  +" L "+ports.x1+" "+ports.y1);
    }
    var title = this.getAttribute("title") || "";
    alongPath.textContent = title;
    alongPath.setAttributeNS("http://www.w3.org/1999/xlink",
            "href", pid);
    var p = this.parentNode;
    if(p) {
        this.svg.setAttribute("width", p.offsetWidth);
        this.svg.setAttribute("height", p.offsetHeight);
    }
};
UmlLinkPrototype.pack = function() {
    var s = this.svg;
    var b = s.getBBox();
    var x0 = Math.floor(b.x)-1;
    var y0 = Math.floor(b.y)-1;
    var w = Math.floor(b.width)+4;
    var h = Math.floor(b.height)+4;

    s.setAttribute("viewBox",x0+" "+y0+" "+w+" "+h);
    s.setAttribute("width", w);
    s.setAttribute("height", h);
    this.style.left = x0+"px";
    this.style.top = y0+"px";
    this.style.width = w+"px";
    this.style.height = h+"px";
};
UmlLinkPrototype.createdCallback = function() {
    this.addEventListener("contextmenu", function(event) {
        menu(event, "Delete", 
            this.rightClick.bind(this));
        event.preventDefault();
    }.bind(this), false);
};
var UmlLink = document.registerElement('uml-link',
    {prototype:UmlLinkPrototype});

var UmlUsagePrototype = Object.create(UmlLinkPrototype);
UmlUsagePrototype.rightClick = function(choice, event) {
    if("Delete" == choice) {
        var diagram = this.parentNode;
        diagram.removeChild(this);
        diagram.wipeout();
    }
};
UmlUsagePrototype.update = function() {
    this.updateStraight();
    this.pack();
};
var UmlUsage = document.registerElement('uml-usage',
    {prototype:UmlUsagePrototype});

var UmlGeneralizationPrototype = Object.create(UmlLinkPrototype);
UmlGeneralizationPrototype.rightClick = function(choice, event) {
    if("Delete" == choice) {
        var diagram = this.parentNode;
        diagram.removeChild(this);
        diagram.wipeout();
    }
};
UmlGeneralizationPrototype.update = function() {
    if(this.getAttribute("type") == "implement") {
        this.updateDashedArrow();
    } else { 
        this.updateArrowed();
    }
    this.pack();
};
var UmlGeneralization = document.registerElement('uml-generalization',
    {prototype:UmlGeneralizationPrototype});

var UmlIncludePrototype = Object.create(UmlLinkPrototype,{
    defaultTitle:{value:"include"},
});
UmlIncludePrototype.rightClick = function(choice, event) {
    if("Delete" == choice) {
        var diagram = this.parentNode;
        diagram.removeChild(this);
        diagram.wipeout();
    }
};
UmlIncludePrototype.update = function() {
    this.updateDashed();
    this.pack();
};
var UmlInclude = document.registerElement('uml-include',
    {prototype:UmlIncludePrototype});

var UmlExtendPrototype = Object.create(UmlLinkPrototype,{
    defaultTitle:{value:"extend"},
});
UmlExtendPrototype.rightClick = function(choice, event) {
    if("Delete" == choice) {
        var diagram = this.parentNode;
        diagram.removeChild(this);
        diagram.wipeout();
    }
};
UmlExtendPrototype.update = function() {
    this.updateDashed();
    this.pack();
};
var UmlExtend = document.registerElement('uml-extend',
    {prototype:UmlExtendPrototype});

function getPortsFor(a,b,ref) {
    var e1=null,x1=0,y1=0,
        e2=null,x2=0,y2=0,
        xf1,yf1,xf2,yf2,
        L=16;
    var dx = dy = 0;
    if(ref) {
        dx = ref.pageX;
        dy = ref.pageY;
    }
    if(a.match(/,/)) {
        x1 = (+(a.replace(/,.*/,"")) || 0)+dx;
        y1 = (+(a.replace(/.*,/,"")) || 0)+dy;
    } else {
        e1 = document.querySelector("#"+a);
        if(e1) {
            x1 = e1.pageX+e1.width/2;
            y1 = e1.pageY+e1.height/2;
        }
    }
    if(b.match(/,/)) {
        x2 = (+(b.replace(/,.*/,"")) || 0)+dx;
        y2 = (+(b.replace(/.*,/,"")) || 0)+dy;
    } else {
        e2 = document.querySelector("#"+b);
        if(e2) {
            x2 = e2.pageX+e2.width/2;
            y2 = e2.pageY+e2.height/2;
        }
    }
    xf1 = x1; 
    yf1 = y1; 
    xf2 = x2;
    yf2 = y2;
    if(e1) {
        if(e1.getPort) {
            var p = e1.getPort(x1,y1,x2,y2);
            xf1 = p.x;
            yf1 = p.y;
        } else {
            var l = Math.sqrt(Math.max(1,
                    Math.pow(x2-x1,2)+Math.pow(y2-y1,2)));
            xf1 = x1+(x2-x1)/l*L;
            yf1 = y1+(y2-y1)/l*L;
        }
    }
    if(e2) {
        if(e2.getPort) {
            var p = e2.getPort(x2,y2,x1,y1);
            xf2 = p.x;
            yf2 = p.y;
        } else {
            var l = Math.sqrt(Math.max(1,
                    Math.pow(x2-x1,2)+Math.pow(y2-y1,2)));
            xf2 = x2+(x1-x2)/l*L;
            yf2 = y2+(y1-y2)/l*L;
        }
    }
    
    return {
        x1:xf1-dx,
        y1:yf1-dy,
        x2:xf2-dx,
        y2:yf2-dy,
        e1:e1,
        e2:e2,
    };
}

function shadowRouting(options) {
    options = options || {};
    var source = options.source;
    if(source) {
        var link = _("uml-link", {
            "from":idOrNewId(source),
            "to": (source.offsetLeft+source.width/2)+","
                 +(source.offsetTop+source.height/2),
            style:"width:100%;height:100%;",
            linktype:(options.linktype || "line"),
            title:options.title || "",
        });
        var inside = options.inside || document.body;
        inside.insertBefore(link, inside.firstChild);
        // XXX: better with a div, svg has become superfluous
        var capture = inside.appendChild(_("svg",{
                "xmlns": "http://www.w3.org/2000/svg",
                version:"1.1", style:"position:absolute;"
                +"width:100%;height:100%",
            }));
        var dx = source.pageX-source.offsetLeft;
        var dy = source.pageY-source.offsetTop;
        var accept = options.accept || (
            options.acceptNode?function(target){
                if(target)
                if(target != source)
                if(options.acceptNode == target.nodeName.toUpperCase())
                return true;
            }:function(target) {
                if(target) 
                if(target.parentNode == inside)
                if(target != source)
                if(target != capture)
                if(target != link)
                return true;
            });
        var destination = null;
        capture.addEventListener("mousemove", function(event) {
            var targets = elementsFromPoint(event.pageX, event.pageY);
            destination = targets.find(accept);
            link.setAttribute("to",destination?
                    idOrNewId(destination):
                    ((event.pageX-dx)+","+(event.pageY-dy)));
            link.update();
        });
        var done = options.done || function() {};
        capture.addEventListener("mousedown", function(event) {
            var from = link.getAttribute("from");
            var to = link.getAttribute("to");
            inside.removeChild(link);
            inside.removeChild(capture);
            if(destination) options.done(from,to);
        });
    }
}

function editInPlace(self,options) {
    options = options || {};
    var editor = _(options.tag || "div",{contenteditable:true});
    editor.textContent = ""+self.textContent;
    self.textContent = "";
    editor.onblur = editor.onchange = function(event) {
        var lt = String.fromCharCode(60);
        var gt = String.fromCharCode(62);
        var multiline = editor.innerHTML
            .replace(lt+"br"+gt,"\n","g")
            .replace(lt+"[^"+gt+"]*"+gt,"","g")
            .trim();
        //var txt = ""+editor.textContent;
        //console.log("COMMIT", txt,multiline);
        self.textContent = "";
        self.textContent = multiline;
        if(options.callback) options.callback();
    };
    var r = document.createRange();
    self.appendChild(editor);
    r.selectNodeContents(editor);
    var sel = window.getSelection();
    editor.focus();
    sel.removeAllRanges();
    sel.addRange(r);
}

var UmlActorPrototype = Object.create(HTMLDivElement.prototype, sizeGetters);
UmlActorPrototype.createdCallback = function() {
    draggableInParent(this);
    this.addEventListener("dblclick", this.edit.bind(this));
    this.addEventListener("contextmenu", function(event) {
        menu(event, "Link,Generalize,Unlink,Delete", 
            this.rightClick.bind(this));
        event.preventDefault();
    }.bind(this));
};
UmlActorPrototype.edit = function(event) {
    if(event) event.preventDefault();
    editInPlace(this);
};
UmlActorPrototype.rightClick = function(choice, event) {
    if("Link" == choice) {
        shadowRouting({
            source:this,
            inside:this.parentNode,
            acceptNode:"UML-USECASE",
            done:function(from,to) {
                this.parentNode.insertBefore(_('uml-usage', {
                    "from":from, "to":to,
                }), this.parentNode.firstChild).update();
            }.bind(this),
        });
    } else if("Generalize" == choice) {
        shadowRouting({
            source:this,
            inside:this.parentNode,
            linktype:"arrowed",
            acceptNode:"UML-ACTOR",
            done:function(from,to) {
                this.parentNode.insertBefore(_('uml-generalization', {
                    "from":from, "to":to,
                }), this.parentNode.firstChild).update();
            }.bind(this),
        });
    } else if("Unlink" == choice) {
        var impacted = this.parentNode.querySelectorAll(
            'uml-usage[from="'+this.id+'"],'+
            'uml-usage[to="'+this.id+'"],'+
            'uml-include[from="'+this.id+'"],'+
            'uml-include[to="'+this.id+'"],'+
            'uml-extend[from="'+this.id+'"],'+
            'uml-extend[to="'+this.id+'"],'+
            'uml-generalization[from="'+this.id+'"],'+
            'uml-generalization[to="'+this.id+'"]');
        [].forEach.call(impacted, function(i) {
            i.parentNode.removeChild(i);
        });
    } else if("Delete" == choice) {
        var diagram = this.parentNode;
        diagram.removeChild(this);
        diagram.wipeout();
    }
};
var UmlActor = document.registerElement('uml-actor',
    {prototype:UmlActorPrototype});

var UmlUsecasePrototype = Object.create(HTMLDivElement.prototype, sizeGetters);
UmlUsecasePrototype.createdCallback = function() {
    draggableInParent(this);
    this.addEventListener("dblclick", this.edit.bind(this));
    this.addEventListener("contextmenu", function(event) {
        menu(event, "Link,Generalize,Include,Extend,Unlink,Delete", 
            this.rightClick.bind(this));
        event.preventDefault();
    }.bind(this));
};
UmlUsecasePrototype.edit = function(event) {
    if(event) event.preventDefault();
    editInPlace(this,{
        callback:function() {
            this.parentNode.update();
        }.bind(this)
    });
};
UmlUsecasePrototype.getPort = function(x1,y1,x2,y2) {
    // nearest port for connecting an arrow near x1,y1
    // say x1,y1 is center of ellipse
    var a = this.width/2;
    var b = this.height/2;
    var x0 = x2-x1;
    var y0 = y2-y1;
    var sq = Math.sqrt((Math.pow(a*y0,2)
            +Math.pow(b*x0,2)) || 1);
    return {
        x:x1+a*b*x0/sq,
        y:y1+a*b*y0/sq,
    };
};
UmlUsecasePrototype.rightClick = function(choice, event) {
    if("Link" == choice) {
        shadowRouting({
            source:this,
            inside:this.parentNode,
            acceptNode:"UML-ACTOR",
            done:function(from,to) {
                this.parentNode.insertBefore(_('uml-usage', {
                    "from":to, "to":from,
                }), this.parentNode.firstChild).update();
            }.bind(this),
        });
    } else if("Generalize" == choice) {
        shadowRouting({
            source:this,
            inside:this.parentNode,
            linktype:"arrowed",
            acceptNode:"UML-USECASE",
            done:function(from,to) {
                this.parentNode.insertBefore(_('uml-generalization', {
                    "from":from, "to":to,
                }), this.parentNode.firstChild).update();
            }.bind(this),
        });
    } else if("Include" == choice) {
        shadowRouting({
            source:this,
            inside:this.parentNode,
            linktype:"dashed",
            title:"include",
            acceptNode:"UML-USECASE",
            done:function(from,to) {
                this.parentNode.insertBefore(_('uml-include', {
                    "from":from, "to":to,
                }), this.parentNode.firstChild).update();
            }.bind(this),
        });
    } else if("Extend" == choice) {
        shadowRouting({
            source:this,
            inside:this.parentNode,
            linktype:"dashed",
            title:"extend",
            acceptNode:"UML-USECASE",
            done:function(from,to) {
                this.parentNode.insertBefore(_('uml-extend', {
                    "from":from, "to":to,
                }), this.parentNode.firstChild).update();
            }.bind(this),
        });
    } else if("Unlink" == choice) {
        var impacted = this.parentNode.querySelectorAll(
            'uml-usage[from="'+this.id+'"],'+
            'uml-usage[to="'+this.id+'"],'+
            'uml-include[from="'+this.id+'"],'+
            'uml-include[to="'+this.id+'"],'+
            'uml-extend[from="'+this.id+'"],'+
            'uml-extend[to="'+this.id+'"],'+
            'uml-generalization[from="'+this.id+'"],'+
            'uml-generalization[to="'+this.id+'"]');
        [].forEach.call(impacted, function(i) {
            i.parentNode.removeChild(i);
        });
    } else if("Delete" == choice) {
        var diagram = this.parentNode;
        diagram.removeChild(this);
        diagram.wipeout();
    }
};
var UmlUsecase = document.registerElement('uml-usecase',
    {prototype:UmlUsecasePrototype});

function globalTools(self) {
    if(!self.querySelector("div.dangerous")) {
        var d = _("div",{"class":"dangerous",
            "style":"position:absolute;right:0;bottom:0",
            });
        var b;
        if("class" == self.umlDiagramType) {
            b = _("button",{"class":"zipnano",
                "onclick":"this.parentNode.parentNode.zip()"
                });
            b.textContent = "Zip";
            d.appendChild(b);
        }
        b = _("button",{"class":"deleteconfirm"});
        b.textContent = "Delete";
        d.appendChild(b);
        b = _("button",{"class":"confirmdelete",
            "onclick":"this.parentNode.parentNode.parentNode.removeChild(this.parentNode.parentNode)"
            });
        b.textContent = "Confirm";
        d.appendChild(b);
        self.appendChild(d);
    }
}



var UmlUsecaseDiagramPrototype = Object.create(HTMLDivElement.prototype,{
    umlDiagramType:{value:"usecase"},
    pageX:sizeGetters.pageX,
    pageY:sizeGetters.pageY,
});
UmlUsecaseDiagramPrototype.createdCallback = function() {
    this.addEventListener("mousemove", function(event) {
        if(this.dragging) {
            this.style.cursor = "move";
            var d = this.dragging;
            var e = d.element;
            e.style.left = (+(d.x0+(event.pageX-d.px0)))+"px";
            e.style.top =  (+(d.y0+(event.pageY-d.py0)))+"px";
            event.preventDefault();
            var cs = getComputedStyle(this);
            var minwidth = e.offsetLeft+e.width;
            var curwidth = +(cs.width.replace(/px/,""));
            var minheight = e.offsetTop+e.height;
            var curheight = +(cs.height.replace(/px/,""));
            if(Math.max(curwidth,minwidth) == minwidth) {
                this.style.minWidth = minwidth+"px";
            }
            if(Math.max(curheight,minheight) == minheight) {
                this.style.minHeight = minheight+"px";
            }
            if(e.update) e.update();
            if(e.id) {
                var impacted = e.parentNode.querySelectorAll(
                    'uml-usage[from="'+e.id+'"],'+
                    'uml-usage[to="'+e.id+'"],'+
                    'uml-include[from="'+e.id+'"],'+
                    'uml-include[to="'+e.id+'"],'+
                    'uml-extend[from="'+e.id+'"],'+
                    'uml-extend[to="'+e.id+'"],'+
                    'uml-generalization[from="'+e.id+'"],'+
                    'uml-generalization[to="'+e.id+'"]');
                [].forEach.call(impacted, function(i) {
                    if(i.update) i.update();
                });
            }
        }
    }.bind(this));
    this.addEventListener("mouseup", function(event) {
        this.style.cursor = "auto";
        this.dragging = undefined;
    }.bind(this));
    globalTools(this);
};
UmlUsecaseDiagramPrototype.update = function() {
    [].forEach.call(this.querySelectorAll(
            "uml-usage,uml-generalization,uml-include,uml-extend"), function(u) {
        u.update();
    });
};
UmlUsecaseDiagramPrototype.wipeout = function() {
    [].forEach.call(this.querySelectorAll(
            "uml-usage,uml-generalization,uml-include,uml-extend"), function(u) {
        var from = document.querySelector("#"+u.getAttribute("from"));
        var to = document.querySelector("#"+u.getAttribute("to"));
        if((!from) || (!to)) {
            u.parentNode.removeChild(u);
        }
    });
};
UmlUsecaseDiagramPrototype.startDrag = function(event, element) {
    this.dragging = {element:element,
        x0: +((element.style.left || "0").replace(/px/,"")),
        y0: +((element.style.top || "0").replace(/px/,"")),
        px0: event.pageX,
        py0: event.pageY,
        };
};
UmlUsecaseDiagramPrototype.addActor = function(name) {
    name = name || "Anonymous";
    var b = _("uml-actor");
    b.textContent = name;
    return this.appendChild(b);
};
UmlUsecaseDiagramPrototype.addUsecase = function(name) {
    name = name || "Anonymous";
    var b = _("uml-usecase");
    b.textContent = name;
    return this.appendChild(b);
};
var UmlUsecaseDiagram = document.registerElement('uml-usecase-diagram',
    {prototype:UmlUsecaseDiagramPrototype});


var UmlLifelanePrototype = Object.create(HTMLSpanElement.prototype, {
    participant:{get:function() {
        return this.querySelector("uml-participant") || 
            this.insertBefore(_("uml-participant"),this.firstChild);
    }},
    lane:{get:function() {
        return this.querySelector("uml-lane") || 
            this.appendChild(_("uml-lane"));
    }},
    name:{
        get:function() {
            return this.participant.textContent;
        },
        set:function(value) {
            return (this.participant.textContent = value);
        }
    },
    pageX:sizeGetters.pageX,
    pageY:sizeGetters.pageY,
    width:sizeGetters.width,
    height:sizeGetters.height,
});
UmlLifelanePrototype.createdCallback = function() {
    draggableInParent(this);
    this.addEventListener("dblclick", this.edit.bind(this));
    var lane = this.lane;
    var start = lane.querySelector("uml-dots") ||
                lane.appendChild(_("uml-dots"));
    var end = lane.querySelector("uml-dots:last-child");
    if(end == start) { end = lane.appendChild(_("uml-dots")) };
    var life = lane.querySelector("uml-life") ||
               lane.insertBefore(_("uml-life"), end);
};
UmlLifelanePrototype.edit = function(event) {
    if(event) event.preventDefault();
    editInPlace(this.participant,{tag:"span"});
};
UmlLifelanePrototype.getPort = function(x1,y1,x2,y2) {
    return {
        x:x1,
        y:y1,
    };
};
UmlLifelanePrototype.update = function() {
	if(!this.id) return;
	var diagram = this.parentNode;
	var h = 12;
	[].forEach.call(diagram.querySelectorAll("uml-message,uml-return,uml-async"),
		function(msg) {
		if( (this.id == msg.getAttribute("from")) ||
		    (this.id == msg.getAttribute("to")) ) {
			h = Math.max(h, msg.offsetTop); 
		}
    }.bind(this));
	this.querySelector("uml-life").style.height = h+"px";
};
var UmlLifelane = document.registerElement('uml-lifelane',
    {prototype:UmlLifelanePrototype});


var UmlMessagePrototype = Object.create(HTMLDivElement.prototype, {
	lanes:{get:function() {
		return ["from","to"].map(function(attr) {
			return document.querySelector("#"
					+this.getAttribute(attr));
		}.bind(this));
	}},
    diagram:{get:function() {
        var current = this.parentNode;
        while(current) {
            var tag = (current.nodeName || "").toUpperCase();
            if("UML-SEQUENCE-DIAGRAM" == tag) return current;
            current = current.parentNode;
        }
    }},
    pageX:sizeGetters.pageX,
    pageY:sizeGetters.pageY,
    width:sizeGetters.width,
    height:sizeGetters.height,
});
UmlMessagePrototype.createdCallback = function() {
    draggableInParent(this, this.diagram);
    this.addEventListener("dblclick", this.edit.bind(this));
    this.addEventListener("contextmenu", function(event) {
        event.preventDefault();
        menu(event, "Block,Unblock,Delete", 
            this.rightClick.bind(this),{
        });
    }.bind(this), false);
};
UmlMessagePrototype.rightClick = function(choice, event) {
    if("Block" == choice) {
        var p = this.parentNode;
        if(p) {
            var b = _("uml-block");
            this.parentNode.insertBefore(b, this);
            this.parentNode.removeChild(this);
            b.appendChild(this);
            var effectivity = _("uml-effectivity");
            b.insertBefore(effectivity, b.firstChild);
            var guard = _("uml-guard");
            guard.textContent = "...";
            effectivity.appendChild(guard);
            b.update();
            b.diagram.update();
        }
    } else if("Unblock" == choice) {
        var p = this.parentNode;
        if(p.nodeName.toUpperCase() == "UML-BLOCK") {
            var p2 = p.parentNode;
            var children = [].map
                .call(p.children,function(c){return c})
                .filter(function(c){
                    return c.nodeName.toUpperCase() != "UML-EFFECTIVITY";
                })
                ;
            children.forEach(function(c) {
                c.parentNode.removeChild(c);
                if(c.nodeName.toUpperCase() != "UML-GUARD") {
                    p2.insertBefore(c,p);
                }
            });
            p2.removeChild(p);
            p2.diagram.update();
        };
    } else if("Delete" == choice) {
        this.parentNode.removeChild(this);
    }
};
UmlMessagePrototype.edit = function(event) {
    if(event) event.preventDefault();
    editInPlace(this);
	this.diagram.update();
};
UmlMessagePrototype.update = function() {
    var from = this.getAttribute("from") || "0,0";
    var to =   this.getAttribute("to") || "0,0";

    var ports = getPortsFor(from,to,this.diagram);
    // Ref is diagram;
    var x = Math.min(ports.x1, ports.x2);
    var w =  Math.abs(ports.x1 - ports.x2);
    var c = "arrow"+((x==ports.x1)?"right":"left");
    var c2 = this.getAttribute("linkstyle") || "";
    this.className = c+" "+c2;
    this.style.left = (x+6)+"px";
    this.style.width = Math.max(1,(w-6))+"px";
}
var UmlMessage = document.registerElement('uml-message',
    {prototype:UmlMessagePrototype});

var UmlReturnPrototype = Object.create(UmlMessagePrototype, sizeGetters);
var UmlReturn = document.registerElement('uml-return',
    {prototype:UmlReturnPrototype});

var UmlAsyncPrototype = Object.create(UmlMessagePrototype, sizeGetters);
var UmlAsync = document.registerElement('uml-async',
    {prototype:UmlAsyncPrototype});


function messageRouting(options) {
    options = options || {};
    var source = options.source;
    var diagram = source.parentNode;
    var inside = options.inside || source.parentNode;
    var x = options.event.pageX-source.parentNode.pageX;
    var y = options.event.pageY-source.parentNode.pageY;

    var link = _("uml-message", {
        "from":idOrNewId(source),
        "to":x+","+y,
		"linkstyle":options.linkstyle || "messagestyle",
    });
    console.log("Routing" + (
		options.linkstyle || "messagestyle"));

    link.textContent = options.title || "...";

    // FIXME: append at nearest y

    var after = [].find.call(inside.querySelectorAll("uml-message,uml-return,uml-async"), 
        function(msg) {
            return (y == Math.min(y, msg.offsetTop+msg.offsetHeight));
        });
    (after?(after.parentNode):inside).insertBefore(link, after);
    var capture = diagram.insertBefore(_("div",{
            style:"position:absolute;width:100%;height:100%;z-index:255",
        }), diagram.firstChild);
    var destination;
    capture.addEventListener("mousemove", function(event) {
        var targets = elementsFromPoint(event.pageX, event.pageY);
        var life = targets.find(function(n) {
            if(n)
            if(n.nodeName)
            if(n.nodeName.toUpperCase() == "UML-LIFE")
            if(n.parentNode)
            if(n.parentNode.parentNode != source)
            return true;
        });
        if(life) {
            destination = life.parentNode.parentNode;
            link.setAttribute("to",idOrNewId(destination));
            link.update();
        } else {
            destination = null;
            var x = event.pageX-source.parentNode.pageX;
            link.setAttribute("to",x+","+y);
            link.update();
        }
    });
	var done = options.done || function() {};
    capture.addEventListener("mousedown", function(event) {
        diagram.removeChild(capture);
        var from = link.getAttribute("from");
        var to = link.getAttribute("to");
        if(link.parentNode) link.parentNode.removeChild(link);
        if(destination) {
			var msg = done(from,to,after);
			msg.lanes.forEach(function(lane) {
				lane.update();
			});
            if(msg.edit) msg.edit();
		}
    });
    link.update();
}

var UmlBlockPrototype = Object.create(HTMLDivElement.prototype,{
    diagram:{get:function(){
        var current = this.parentNode;
        while(current) {
            if(current.nodeName.toUpperCase() == "UML-SEQUENCE-DIAGRAM") {
                return current;
            }
            current = current.parentNode;
        }
    }},
});
UmlBlockPrototype.update = function() {
    var effectivity = this.querySelector("uml-effectivity");
    var x0 = this.offsetLeft; // XXX: merely zero for now
    var l = [].map.call(this.querySelectorAll("uml-message,uml-return,uml-async"),
        function(x){return x});
    var x1 = Math.min.apply(null, l.map(function(m){return m.offsetLeft}));
    var x2 = Math.max.apply(null, l.map(function(m){
                return m.offsetLeft+m.offsetWidth}));
    var y1 = Math.min.apply(null, l.map(function(m){return m.offsetTop}));
    var y2 = Math.max.apply(null, l.map(function(m){
                return m.offsetTop+m.offsetHeight}));
    effectivity.style.marginLeft = (x1-x0)+"px";
    effectivity.style.width = (-1+(x2-x1))+"px";
    effectivity.style.height = (5+(y2-y1))+"px";
};
var UmlBlock = document.registerElement('uml-block',
    {prototype:UmlBlockPrototype});

["uml-participant","uml-lane","uml-dots","uml-effectivity"
].forEach(function(tag) {
    document.registerElement(tag,{prototype:Object.create(
            HTMLDivElement.prototype)});
});
var UmlLifePrototype = Object.create(HTMLDivElement.prototype);
UmlLifePrototype.createdCallback = function() {
    this.addEventListener("contextmenu", function(event) {
        menu(event, "Message,Async,Return,Reflexive,Delete", 
            this.rightClick.bind(this),{
            originalEvent:true,
        });
        event.preventDefault();
    }.bind(this), false);
};
function ancestorIn(descendant, container) {
    var current = descendant;
    while(current != null) {
        if(current.parentNode == container) {
            return current;
        }
        current = current.parentNode;
    }
}
UmlLifePrototype.rightClick = function(choice, event) {
	var lifelane = this.parentNode.parentNode;
	var diagram = lifelane.parentNode;
    function getInside() {
        return elementsFromPoint(event.pageX, event.pageY)
                .find(function(candidate) {
                    if(candidate) {
                        var tag = candidate.nodeName.toUpperCase();
                        return ((tag == "UML-BLOCK")||(tag == "UML-SEQUENCE-DIAGRAM"));
                    }
                });
    }
    if("Message" == choice) {
        var inside = getInside();
        messageRouting({
            source:lifelane,
            inside:inside,
            event:event,
            done:function(from,to,after) {
                var msg = _('uml-message', { "from":from, "to":to, });
                inside.insertBefore(msg,ancestorIn(after,inside));
				msg.textContent = "...()"
				msg.update();
				return msg;
            }.bind(this),
        });
    } else if("Return" == choice) {
        var inside = getInside();
        messageRouting({
            source:lifelane,
            inside:inside,
            event:event,
			linkstyle:"returnstyle",
            done:function(from,to,after) {
                var msg = _('uml-return', { "from":from, "to":to, });
                inside.insertBefore(msg,ancestorIn(after,inside));
				msg.textContent = "..."
				msg.update();
				return msg;
            }.bind(this),
        });
    } else if("Async" == choice) {
        var inside = getInside();
        messageRouting({
            source:lifelane,
            inside:inside,
            event:event,
			linkstyle:"asyncstyle",
            done:function(from,to,after) {
                var msg = _('uml-async', { "from":from, "to":to, });
                inside.insertBefore(msg,ancestorIn(after,inside));
				msg.textContent = "..."
				msg.update();
				return msg;
            }.bind(this),
        });
    } else if("Reflexive" == choice) {
        var inside = getInside();
        var y = event.pageY-lifelane.parentNode.pageY;
        var after = [].find.call(inside.querySelectorAll(
                "uml-message,uml-return,uml-async"), function(msg) {
            return (y == Math.min(y, msg.offsetTop+msg.offsetHeight));
        });
        console.log("here", lifelane);
        var l2 = lifelane.parentNode.insertBefore(
                _("uml-lifelane"), lifelane.nextSibling);
        var id = idOrNewId(lifelane);
        var id2 = idOrNewId(l2);
        var msg = _('uml-message', { "from":id, "to":id2, });
        (l2.querySelector("uml-dots") || l2).style.marginTop = (y || 0)+"px";
        (l2.querySelector("uml-life") || l2).style.background = "white";
        inside.insertBefore(msg,ancestorIn(after,inside));
        msg.textContent = "..."
        msg.update();
        lifelane.style.marginRight = "-5px";
    } else if("Delete" == choice) {
        var target = this.parentNode.parentNode;
        var diagram = target.parentNode;
        diagram.removeChild(target);
        diagram.wipeout();
    }
};
var UmlLife = document.registerElement('uml-life',
    {prototype:UmlLifePrototype});

var UmlGuardPrototype = Object.create(HTMLDivElement.prototype);
UmlGuardPrototype.createdCallback = function() {
    this.addEventListener("dblclick", this.edit.bind(this));
};
UmlGuardPrototype.edit = function(event) {
    if(event) event.preventDefault();
    editInPlace(this);
};
var UmlGuard = document.registerElement('uml-guard',
    {prototype:UmlGuardPrototype});


var UmlSequenceDiagramPrototype = Object.create(HTMLDivElement.prototype,{
    umlDiagramType:{value:"sequence"},
    pageX:sizeGetters.pageX,
    pageY:sizeGetters.pageY,
});
UmlSequenceDiagramPrototype.createdCallback = function() {
    this.addEventListener("mousemove", function(event) {
        if(this.dragging) {
            this.style.cursor = "move";
            if(this.dragging.dragtype == "message") {
                var e = this.dragging.element;
                var y = event.pageY-this.pageY;
                // FIXME: add block top border as "before" candidate
                var after = [].find.call(this.querySelectorAll(
                        "uml-message,uml-return,uml-async"), 
                    function(msg) {
                        return (y == Math.min(y, msg.offsetTop+msg.offsetHeight));
                    });
                if(after != e) {
                    if(e.parentNode) e.parentNode.removeChild(e);
                    (after?(after.parentNode):this).insertBefore(e,after);
                    e.lanes.forEach(function(lane) {
                        lane.update();
                    });
                    [].forEach.call(
                            e.diagram.querySelectorAll("uml-block"), 
                            function(b) { b.update(); });
                }
            } else {
                var d = this.dragging;
                var e = d.element;
                var o = d.originElement;
                e.style.marginRight = (d.mr0+event.pageX-d.px0)+"px";
                this.update();
            }
        }
    }.bind(this));
    this.addEventListener("mouseup", function(event) {
        this.style.cursor = "auto";
        this.dragging = undefined;
    }.bind(this));
    globalTools(this);
};
UmlSequenceDiagramPrototype.wipeout = function() {
    [].forEach.call(this.querySelectorAll(
            "uml-message,uml-return,uml-async"), function(msg) {
        var from = document.querySelector("#"+msg.getAttribute("from"));
        var to = document.querySelector("#"+msg.getAttribute("to"));
        if((!from) || (!to)) {
            msg.parentNode.removeChild(msg);
        }
    });
};
UmlSequenceDiagramPrototype.update = function() {
    [].forEach.call(this.querySelectorAll(
            "uml-message,uml-return,uml-async"), function(msg) {
        msg.update();
    });
    [].forEach.call(this.querySelectorAll("uml-block"), function(b) {
        b.update();
    });
    [].forEach.call(this.querySelectorAll("uml-lifelane"), function(b) {
        b.update();
    });
};
function previousBrotherOrSelf(e) {
    if(e) {
        var p = e.parentNode;
        if(p) {
            var relatives = [].map.call(
                p.querySelectorAll(e.tagName),
                function(n){return n});
            var i = relatives.indexOf(e);
            return relatives[Math.max(0,i-1)];
        }
    }
}
function followingBrother(e) {
    if(e) {
        var p = e.parentNode;
        if(p) {
            var relatives = [].map.call(
                p.querySelectorAll(e.tagName),
                function(n){return n});
            var i = relatives.indexOf(e);
            if((i+1) in relatives) {
                return relatives[i+1];
            }
        }
    }
}
UmlSequenceDiagramPrototype.startDrag = function(event, element) {
    if("UML-LIFELANE" == (element.nodeName.toUpperCase())) {
        var margined = previousBrotherOrSelf(element);
        this.dragging = {element:margined,
            dragtype:"lane",
            originElement:element,
            mr0: +(margined.style.marginRight.replace(/px/,"")),
            px0: event.pageX,
            py0: event.pageY,
        };
    } else {
        this.dragging = {element:element,
            dragtype:"message",
            originalAfter:followingBrother(element),
        };
    }
};
UmlSequenceDiagramPrototype.addLifelane = function(name) {
    name = name || "Anonymous";
    var b = _("uml-lifelane",{style:"margin-right:16px"});
    b.name = name;
    return this.insertBefore(b,this.querySelector("uml-message,uml-return,uml-block,uml-async"));
};
var UmlSequenceDiagram = document.registerElement('uml-sequence-diagram',
    {prototype:UmlSequenceDiagramPrototype});


var UmlMemberPrototype = Object.create(HTMLDivElement.prototype);
UmlMemberPrototype.createdCallback = function() {
    this.addEventListener("dblclick", this.edit.bind(this));
};
UmlMemberPrototype.edit = function(event) {
    if(event) event.preventDefault();
    editInPlace(this,{
	callback:function() {
	    if("" == this.textContent) {
	        this.parentNode.removeChild(this);
	    } else {
            this.parentNode.parentNode.update();
        }
	}.bind(this),
    });
};
var UmlName = document.registerElement('uml-name',
    {prototype:UmlMemberPrototype});
var UmlAttributePrototype = Object.create(UmlMemberPrototype);
var UmlAttribute = document.registerElement('uml-attribute',
    {prototype:UmlAttributePrototype});
var UmlMethodPrototype = Object.create(UmlMemberPrototype);
var UmlMethod = document.registerElement('uml-method',
    {prototype:UmlMethodPrototype});

function selectChildrenAt(ancestor, selector, event) {
    var result = [];
    var ex = event.pageX;
    var ey = event.pageY;
    if(ancestor) {
        var nodes = ancestor.querySelectorAll(selector);
        if(nodes) {
            [].forEach.call(nodes, function(node){
                var nx = node.pageX;
                var ny = node.pageY;
                if(Math.min(nx,ex) == nx)
                if(Math.min(ny,ey) == ny)
                if(Math.min(nx+node.offsetWidth,ex) == ex)
                if(Math.min(ny+node.offsetHeight,ey) == ey)
                result.push(node);
            });
        }
    }
    return result;
}

function shadowClassRouting(options) {
    options = options || {};
    var source = options.source;
    if(source) {
        var link = _("uml-link", {
            "from":idOrNewId(source),
            "to": (source.offsetLeft+source.width/2)+","
                 +(source.offsetTop+source.height/2),
            style:"width:100%;height:100%;",
            linktype:(options.linktype || "line"),
            title:options.title || "",
        });
        var inside = options.inside || document.body;
        inside.insertBefore(link, inside.firstChild);
        var diagram = inside;
        var capture = diagram.insertBefore(_("div",{
                style:"position:absolute;width:100%;height:100%;z-index:255",
            }), diagram.firstChild);
        var dx = source.pageX-source.offsetLeft;
        var dy = source.pageY-source.offsetTop;
        var destination = null;
        var accepted = options.acceptNode.toUpperCase();
        capture.addEventListener("mousemove", function(event) {
            var targets = selectChildrenAt(inside,"uml-class",event);
            destination = targets.find(function(n) {
                return n.nodeName.toUpperCase() == accepted;
            });
            link.setAttribute("to",destination?
                    idOrNewId(destination):
                    ((event.pageX-dx)+","+(event.pageY-dy)));
            link.update();
        });
        var done = options.done || function() {};
        capture.addEventListener("mousedown", function(event) {
            var from = link.getAttribute("from");
            var to = link.getAttribute("to");
            inside.removeChild(link);
            inside.removeChild(capture);
            if(destination) options.done(from,to);
        });
    }
}


var UmlClassPrototype = Object.create(HTMLDivElement.prototype,{
    nameElement:{get:function(){
        return this.querySelector("uml-name") ||
               this.insertBefore(_("uml-name"),
               this.firstChild);
    }},
    name:{
        get:function(){return this.nameElement.textContent},
        set:function(n){this.nameElement.textContent = (n || "")},
    },
    pageX:sizeGetters.pageX,
    pageY:sizeGetters.pageY,
    width:sizeGetters.width,
    height:sizeGetters.height,
});
function lessThan(a,b) {
    return (Math.min(a,b)==a);
}
UmlClassPrototype.getPort = function(x1,y1,x2,y2) {
    var d = Math.sqrt(Math.max(1,
        Math.pow(x1-x2,2)+
        Math.pow(y1-y2,2)));
    var dx = (x2-x1)/d;
    var dy = (y2-y1)/d;
    var dxmin = lessThan(x1,x2)?(this.offsetWidth/2):(-this.offsetWidth/2);
    var dymin = lessThan(y1,y2)?(this.offsetHeight/2):(-this.offsetHeight/2);

    var x3,y3;
    if(lessThan(Math.abs(dxmin*dy),Math.abs(dymin*dx))) {
        // dx wins
        x3 = x1+dxmin;
        y3 = y1+dy*(dxmin/dx);
    } else {
        // dy wins
        y3 = y1+dymin;
        x3 = x1+dx*(dymin/dy);
    }
    return {x:x3,y:y3};
};
UmlClassPrototype.createdCallback = function() {
    draggableInParent(this);
    this.addEventListener("contextmenu", function(event) {
        menu(event, "Attribute,Method,Implement,Extend,"
            +"Compose,Aggregate,Usage,Delete", 
            this.rightClick.bind(this),{
        });
        event.preventDefault();
    }.bind(this), false);
};
UmlClassPrototype.edit = function(event) {
    if(event) event.preventDefault();
    this.nameElement.edit();
};
UmlClassPrototype.rightClick = function(choice, event) {
    if("Method" == choice) {
        var m = _("uml-method");
        m.textContent = "foo()";
        this.appendChild(m).edit();
    } else if("Attribute" == choice) {
        var m = _("uml-attribute");
        m.textContent = "name:String";
        this.insertBefore(m, this.querySelector("uml-method")).edit();
    } else if("Implement" == choice) {
        shadowClassRouting({
            source:this,
            inside:this.parentNode,
            linktype:"dashedarrow",
            acceptNode:"UML-CLASS",
            done:function(from,to) {
                this.parentNode.insertBefore(_('uml-generalization', {
                    "from":from, "to":to,
                    "type":"implement",
                }), this.parentNode.firstChild).update();
            }.bind(this),
        });
    } else if("Extend" == choice) {
        shadowClassRouting({
            source:this,
            inside:this.parentNode,
            linktype:"arrowed",
            acceptNode:"UML-CLASS",
            done:function(from,to) {
                this.parentNode.insertBefore(_('uml-generalization', {
                    "from":from, "to":to,
                    "type":"extend",
                }), this.parentNode.firstChild).update();
            }.bind(this),
        });
    } else if("Compose" == choice) {
        shadowClassRouting({
            source:this,
            inside:this.parentNode,
            linktype:"diamondfull",
            acceptNode:"UML-CLASS",
            done:function(from,to) {
                // XXX: classlinks
                this.parentNode.insertBefore(_('uml-containment', {
                    "from":from, "to":to,
                    "type":"composition",
                }), this.parentNode.firstChild).update();
            }.bind(this),
        });
    } else if("Aggregate" == choice) {
        shadowClassRouting({
            source:this,
            inside:this.parentNode,
            linktype:"diamond",
            acceptNode:"UML-CLASS",
            done:function(from,to) {
                this.parentNode.insertBefore(_('uml-containment', {
                    "from":from, "to":to,
                    "type":"aggregation",
                }), this.parentNode.firstChild).update();
            }.bind(this),
        });
    } else if("Usage" == choice) {
        shadowClassRouting({
            source:this,
            inside:this.parentNode,
            linktype:"dashedemptyarrow",
            acceptNode:"UML-CLASS",
            done:function(from,to) {
                this.parentNode.insertBefore(_('uml-containment', {
                    "from":from, "to":to,
                    "type":"usage",
                }), this.parentNode.firstChild).update();
            }.bind(this),
        });
    } else if("Delete" == choice) {
        var diagram = this.parentNode;
        diagram.removeChild(this);
        diagram.wipeout();
    }
};
var UmlClass = document.registerElement('uml-class',
    {prototype:UmlClassPrototype});


var UmlContainmentPrototype = Object.create(UmlLinkPrototype);
UmlContainmentPrototype.createdCallback = function() {
    UmlLinkPrototype.createdCallback.bind(this)();
    this.addEventListener("dblclick", this.edit.bind(this));
};
function editInSvgPlace(self,edited,options) {
    options = options || {};
    var text = edited.parentNode; 
    var editor = _(options.tag || "div",{contenteditable:true,
        style:("position:absolute;font-family:"
            +"Tahoma,Arial,Helvetica,sans-serif;font-size:10px;"),
    });
    editor.textContent = ""+(self.textContent || "...");
    var bb = edited.parentNode.getBBox();
    edited.textContent = "";
    editor.onblur = editor.onchange = function(event) {
        var txt = ""+editor.textContent;
        editor.parentNode.removeChild(editor);
        edited.textContent = txt;
        if(options.callback) options.callback(txt);
    };
    var r = document.createRange();
    self.parentNode.appendChild(editor);
    editor.style.left = (-bb.width/2+self.offsetWidth/2+self.offsetLeft)+"px";
    editor.style.top = (-10+(self.offsetHeight/2+self.offsetTop))+"px";
    r.selectNodeContents(editor);
    var sel = window.getSelection();
    editor.focus();
    sel.removeAllRanges();
    sel.addRange(r);
}
UmlContainmentPrototype.edit = function(event) {
    var edited = this.querySelector("textPath");
    if(edited) {
        if(event) event.preventDefault();
        editInSvgPlace(this, this.querySelector("textPath"), {
            callback:function(val) {
                this.setAttribute("title",val);
            }.bind(this),
        });
    }
};
UmlContainmentPrototype.rightClick = function(choice, event) {
    if("Delete" == choice) {
        var diagram = this.parentNode;
        diagram.removeChild(this);
        diagram.wipeout();
    }
};
UmlContainmentPrototype.update = function() {
    if(this.getAttribute("type") == "composition") {
        this.updateDiamondFull();
    } else if(this.getAttribute("type") == "usage") {
        this.updateDashedEmptyArrow();
    } else {
        this.updateDiamond();
    }
    this.pack();
};
var UmlContainment = document.registerElement('uml-containment',
    {prototype:UmlContainmentPrototype});

var UmlClassDiagramPrototype = Object.create(HTMLDivElement.prototype,{
    umlDiagramType:{value:"class"},
    pageX:sizeGetters.pageX,
    pageY:sizeGetters.pageY,
});
UmlClassDiagramPrototype.createdCallback = function() {
    this.addEventListener("mousemove", function(event) {
        if(this.dragging) {
            this.style.cursor = "move";
            var d = this.dragging;
            var e = d.element;
            var x = (+(d.x0+(event.pageX-d.px0)));
            var y = (+(d.y0+(event.pageY-d.py0)));
            e.style.left = x+"px";
            e.style.top =  y+"px";
            event.preventDefault();
            var cs = getComputedStyle(this);
            var minwidth = e.offsetWidth+x;
            var curwidth = +(cs.width.replace(/px/,""));
            var minheight = e.offsetHeight+y;
            var curheight = +(cs.height.replace(/px/,""));
            if(Math.max(curwidth,minwidth) == minwidth) {
                this.style.minWidth = minwidth+"px";
            }
            if(Math.max(curheight,minheight) == minheight) {
                this.style.minHeight = minheight+"px";
            }
            if(e.update) e.update();
            if(e.id) {
                // XXX: classlinks
                var impacted = e.parentNode.querySelectorAll(
                    'uml-containment[from="'+e.id+'"],'+
                    'uml-containment[to="'+e.id+'"],'+
                    'uml-generalization[from="'+e.id+'"],'+
                    'uml-generalization[to="'+e.id+'"]'
                    );
                [].forEach.call(impacted, function(i) {
                    if(i.update) i.update();
                });
            }
        }
    }.bind(this));
    this.addEventListener("mouseup", function(event) {
        this.style.cursor = "auto";
        this.dragging = undefined;
    }.bind(this));
    globalTools(this);
};
UmlClassDiagramPrototype.startDrag = function(event, element) {
    this.dragging = {element:element,
        x0: +((element.style.left || "0").replace(/px/,"")),
        y0: +((element.style.top || "0").replace(/px/,"")),
        px0: event.pageX,
        py0: event.pageY,
        };
};
UmlClassDiagramPrototype.addClass = function(name) {
    name = name || "Class";
    var b = _("uml-class");
    b.name = name;
    return this.appendChild(b);
};
UmlClassDiagramPrototype.wipeout = function() {
    [].forEach.call(this.querySelectorAll(
            "uml-containment,uml-generalization"), function(u) {
        var from = document.querySelector("#"+u.getAttribute("from"));
        var to = document.querySelector("#"+u.getAttribute("to"));
        if((!from) || (!to)) {
            u.parentNode.removeChild(u);
        }
    });
};
UmlClassDiagramPrototype.update = function() {
    [].forEach.call(this.querySelectorAll(
            "uml-containment,uml-generalization"), function(u) {
        u.update();
    });
};
UmlClassDiagramPrototype.zip = function() {
    var nano = document.querySelector('a.file[title="Nano.zip"]')
    if(!nano) return;
    var href = nano.getAttribute("href");
    var b64 = href.slice(href.indexOf(";base64,")+
            ";base64,".length);
    var nanozip = new JSZip().load(atob(b64));
    nanozip.remove("Nano/resources/users");
    nanozip.remove("Nano/resources/images");
    [].forEach.call(this.querySelectorAll(
            "uml-class"), function(klass) {
        var name = klass.querySelector("uml-name").textContent.trim();
        var collection = (name=="User")?{"type":"UserCollection"}:{"type":"Collection"};
        collection.properties = {};
        [].forEach.call(klass.querySelectorAll(
                "uml-attribute"), function(attr,i) {
            var parts = attr.textContent.replace(/(^[-=+])|(\*$)/g,"")
                .split(/:/).slice(0,2);
            collection.properties[parts[0]] = {
                "name": parts[0],
                "type": parts[1].toLowerCase(),
                "typeLabel": parts[1],
                "required": false,
                "id": parts[0],
                "order": i
            };
        });
        nanozip.file("Nano/resources/"+name.toLowerCase()+"s/config.json",
            JSON.stringify(collection, null, 4));
    });
    nanozip.file("Nano/public/model.html",
        Replicant.html());
    var a = _("a", {
        "href": "data:application/octet-stream;base64,"+nanozip.generate(),
        "download": "Nano.zip",
    });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
};
var UmlClassDiagram = document.registerElement('uml-class-diagram',
    {prototype:UmlClassDiagramPrototype});


var UmlActivityDiagramPrototype = Object.create(HTMLDivElement.prototype,{
    umlDiagramType:{value:"activity"},
    pageX:sizeGetters.pageX,
    pageY:sizeGetters.pageY,
});
UmlActivityDiagramPrototype.createdCallback = function() {
    this.addEventListener("mousemove", function(event) {
        if(this.dragging) {
            var d = this.dragging;
            var e = d.element;
            var x = (+(d.x0+(event.pageX-d.px0)));
            var y = (+(d.y0+(event.pageY-d.py0)));
            e.style.left = x+"px";
            e.style.top =  y+"px";

            event.preventDefault();
            var cs = getComputedStyle(this);
            var minwidth = e.offsetWidth+x;
            var curwidth = +(cs.width.replace(/px/,""));
            var minheight = e.offsetHeight+y;
            var curheight = +(cs.height.replace(/px/,""));
            if(Math.max(curwidth,minwidth) == minwidth) {
                this.style.minWidth = minwidth+"px";
            }
            if(Math.max(curheight,minheight) == minheight) {
                this.style.minHeight = minheight+"px";
            }

            if(e.update) e.update();
            if(e.id) {
                var impacted = e.parentNode.querySelectorAll(
                    'uml-then[from="'+e.id+'"],'+
                    'uml-then[to="'+e.id+'"]'
                    );
                [].forEach.call(impacted, function(i) {
                    if(i.update) i.update();
                });
            }
        }
    }.bind(this));
    this.addEventListener("mouseup", function(event) {
        this.dragging = undefined;
    }.bind(this));
    globalTools(this);
};
UmlActivityDiagramPrototype.startDrag = function(event, element) {
    this.dragging = {element:element,
        x0: +((element.style.left || "0").replace(/px/,"")),
        y0: +((element.style.top || "0").replace(/px/,"")),
        px0: event.pageX,
        py0: event.pageY,
        };
};
UmlActivityDiagramPrototype.addState = function(event, element) {
    return this.appendChild(_("uml-state",{"type":"start","name":"Start"}));
};
UmlActivityDiagramPrototype.addActivity = function(event, element) {
    var result = this.appendChild(_("uml-activity",{"type":"activity"}));
    result.textContent = "Activity";
    return result;
};
UmlActivityDiagramPrototype.addCondition = function(event, element) {
    return this.appendChild(_("uml-activity",{"type":"condition"}));
};
UmlActivityDiagramPrototype.wipeout = function() {
    [].forEach.call(this.querySelectorAll(
            "uml-then"), function(u) {
        var from = document.querySelector("#"+u.getAttribute("from"));
        var to = document.querySelector("#"+u.getAttribute("to"));
        if((!from) || (!to)) {
            u.parentNode.removeChild(u);
        }
    });
};
var UmlActivityDiagram = document.registerElement('uml-activity-diagram',
    {prototype:UmlActivityDiagramPrototype});

var UmlActivityElementPrototype = Object.create(HTMLDivElement.prototype, sizeGetters);
UmlActivityElementPrototype.createdCallback = function() {
    draggableInParent(this);
    this.addEventListener("dblclick", this.edit.bind(this));
    this.addEventListener("contextmenu", function(event) {
        menu(event, this.menus,
            this.rightClick.bind(this));
        event.preventDefault();
    }.bind(this));
};
UmlActivityElementPrototype.menus = "Link,Delete";
UmlActivityElementPrototype.edit = function(event) {
    if(event) event.preventDefault();
    editInPlace(this);
};
UmlActivityElementPrototype.rightClick = function(choice, event) {
    if(("Start" == choice) || ("Stop" == choice)) {
        this.setAttribute("type", choice.toLowerCase());
    } else if("Link" == choice) {
        shadowRouting({
            source:this,
            inside:this.parentNode,
            linktype:"emptyarrow",
            accept:function(target) {
                if(target)
                if(target != this)
                if( ("UML-ACTIVITY" == target.nodeName.toUpperCase())
                 || ("UML-STATE" == target.nodeName.toUpperCase()) )
                return true;
            }.bind(this),
            done:function(from,to) {
                this.parentNode.insertBefore(_('uml-then', {
                    "from":from, "to":to,
                }), this.parentNode.firstChild).update();
            }.bind(this),
        });
    } else if("Delete" == choice) {
        var diagram = this.parentNode;
        diagram.removeChild(this);
        diagram.wipeout();
    }
};

var UmlStatePrototype = Object.create(UmlActivityElementPrototype, sizeGetters);
UmlStatePrototype.menus = "Link,Start,Stop,Delete";
var UmlState = document.registerElement('uml-state', {prototype:UmlStatePrototype});
var UmlActivityPrototype = Object.create(UmlActivityElementPrototype, sizeGetters);
UmlActivityPrototype.getPort = function(x1,y1,x2,y2) {
    var d = Math.sqrt(Math.max(1,
        Math.pow(x1-x2,2)+
        Math.pow(y1-y2,2)));
    var dx = (x2-x1)/d;
    var dy = (y2-y1)/d;
    var dxmin = lessThan(x1,x2)?(this.offsetWidth/2):(-this.offsetWidth/2);
    var dymin = lessThan(y1,y2)?(this.offsetHeight/2):(-this.offsetHeight/2);

    var x3,y3;
    if(lessThan(Math.abs(dxmin*dy),Math.abs(dymin*dx))) {
        // dx wins
        x3 = x1+dxmin;
        y3 = y1+dy*(dxmin/dx);
    } else {
        // dy wins
        y3 = y1+dymin;
        x3 = x1+dx*(dymin/dy);
    }
    return {x:x3,y:y3};
};

var UmlActivity = document.registerElement('uml-activity', {prototype:UmlActivityPrototype});


var UmlThenPrototype = Object.create(UmlLinkPrototype,{
    //defaultTitle:{value:"1."},
});
UmlThenPrototype.createdCallback = function() {
    this.addEventListener("dblclick", this.edit.bind(this));
    this.addEventListener("contextmenu", function(event) {
        menu(event, "Delete",
            this.rightClick.bind(this));
        event.preventDefault();
    }.bind(this));
};
UmlThenPrototype.edit = function(event) {
    var edited = this.querySelector("textPath");
    if(edited) {
        if(event) event.preventDefault();
        editInSvgPlace(this, this.querySelector("textPath"), {
            callback:function(val) {
                this.setAttribute("title",val);
            }.bind(this),
        });
    }
};
UmlThenPrototype.rightClick = function(choice, event) {
    if("Delete" == choice) {
        var diagram = this.parentNode;
        diagram.removeChild(this);
        diagram.wipeout();
    }
};
UmlThenPrototype.update = function() {
    this.updateEmptyArrow();
    this.pack();
};
var UmlThen = document.registerElement('uml-then',
    {prototype:UmlThenPrototype});




var UmlPalettePrototype = Object.create(HTMLDivElement.prototype);
UmlPalettePrototype.createdCallback = function() {
    this.focusedDiagram = null;
    var selectOrCreate = function(selector,onclick,style) {
        // ex: "button.tool.global.uml-usecase-diagram"
        var result = this.querySelector(selector);
        var parts = selector.split(/\.+/);
        var tag = parts[0];
        var klass = parts.slice(1).join(" ");
        if(!result) {
            result = _(tag, {
                "onclick":onclick,
                "class":klass,
            });
            this.appendChild(result);
        }
        if(style) {
            result.style = style;
        }
        return result;
    }.bind(this);

    selectOrCreate("button.tool.global.uml-usecase-diagram",
                   "this.parentNode.newDiagram('usecase')");
    selectOrCreate("button.tool.global.uml-sequence-diagram",
                   "this.parentNode.newDiagram('sequence')");
    selectOrCreate("button.tool.global.uml-class-diagram",
                   "this.parentNode.newDiagram('class')");
    selectOrCreate("button.tool.global.uml-activity-diagram",
                   "this.parentNode.newDiagram('activity')");

    selectOrCreate("button.tool.usecase.uml-actor",
                   "this.parentNode.newUmlActor()",
                   "display:none");
    selectOrCreate("button.tool.usecase.uml-usecase",
                   "this.parentNode.newUmlUsecase()",
                   "display:none");
    selectOrCreate("button.tool.sequence.uml-lifelane",
                   "this.parentNode.newUmlLifelane()",
                   "display:none");
    selectOrCreate("button.tool.class.uml-class",
                   "this.parentNode.newUmlClass()",
                   "display:none");
    selectOrCreate("button.tool.activity.uml-state",
                   "this.parentNode.newUmlState()",
                   "display:none");
    selectOrCreate("button.tool.activity.uml-activity",
                   "this.parentNode.newUmlActivity()",
                   "display:none");
    selectOrCreate("button.tool.activity.uml-condition",
                   "this.parentNode.newUmlCondition()",
                   "display:none");
};
UmlPalettePrototype.newUmlActor = function(diagram) {
    diagram = diagram || this.focusedDiagram;
    if(diagram) {
        diagram.addActor().edit();
    }
};
UmlPalettePrototype.newUmlUsecase = function(diagram) {
    diagram = diagram || this.focusedDiagram;
    if(diagram) {
        diagram.addUsecase().edit();
    }
};
UmlPalettePrototype.newUmlLifelane = function(diagram) {
    diagram = diagram || this.focusedDiagram;
    if(diagram) {
        diagram.addLifelane().edit();
    }
};
UmlPalettePrototype.newUmlClass = function(diagram) {
    diagram = diagram || this.focusedDiagram;
    if(diagram) {
        diagram.addClass().edit();
    }
};
UmlPalettePrototype.newUmlState = function(diagram) {
    diagram = diagram || this.focusedDiagram;
    if(diagram) {
        diagram.addState().edit();
    }
};
UmlPalettePrototype.newUmlCondition = function(diagram) {
    diagram = diagram || this.focusedDiagram;
    if(diagram) {
        diagram.addCondition().edit();
    }
};
UmlPalettePrototype.newUmlActivity = function(diagram) {
    diagram = diagram || this.focusedDiagram;
    if(diagram) {
        diagram.addActivity().edit();
    }
};
UmlPalettePrototype.newDiagram = function(type, container) {
    container = container || document.body;
    if(type in {usecase:1,sequence:1,"class":1,activity:1}) {
        var d = _("uml-"+type+"-diagram");
        d.setAttribute("onclick","if(document.querySelector('uml-palette'))document.querySelector('uml-palette').focusDiagram(this)");
        container.appendChild(d);
        this.focusDiagram(d);
    }
};
UmlPalettePrototype.displayButtons = function(selector,style) {
    [].forEach.call(
            this.querySelectorAll(selector),
            function(b) {
        b.style.display = style;
    });
};
UmlPalettePrototype.focusDiagram = function(d) {
    this.focusedDiagram = d;
    if(d) {
        this.style.display = "block";
        this.displayButtons("button.global","none");
        this.displayButtons("button.usecase,button.sequence,button.class,button.activity","none");
        this.displayButtons("button."+d.umlDiagramType, "block");
    } else {
        this.displayButtons("button.global","block");
        this.displayButtons("button.usecase,button.sequence,button.class,button.activity","none");
    }
};
var UmlPalette = document.registerElement('uml-palette',
    {prototype:UmlPalettePrototype});

})();
