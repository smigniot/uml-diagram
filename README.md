# uml-diagram

## About

uml-diagram is a [Custom Elements](https://www.w3.org/TR/custom-elements/) implementation of main [UML](https://en.wikipedia.org/wiki/Unified_Modeling_Language) diagrams in Javascript.

* Provides html tags such as `<uml-class-diagram>` and `<uml-class>`
* Provides a [UML diagram editor](https://rawgit.com/smigniot/uml-diagram/master/Uml_0.0.46.html)

## Usage

Open https://rawgit.com/smigniot/uml-diagram/master/Uml_0.0.46.html ,
start some UML diagrams using the palette on the right and click on save.

![Image of reverse engineering of uml-diagram, using uml-diagram](https://rawgit.com/smigniot/uml-diagram/master/doc/uml-diagrams-reversed.png)

## Custom elements

Use the custom elements directly by linking. This first block goes into the head :
```html
<script type="text/javascript" src="https://rawgit.com/smigniot/uml-diagram/master/src/webcomponents-lite-0.7.12.min.js">
</script>
<script type="text/javascript" src="https://rawgit.com/smigniot/uml-diagram/master/src/uml-diagram-0.0.46.js">
</script>
<link rel="stylesheet" type="text/css" href="https://rawgit.com/smigniot/uml-diagram/master/src/uml-diagram-0.0.46.css">
</link>
```

Now the tags are available in the document body

```xml
<uml-class-diagram>
 <uml-class>
  <uml-name>Person</uml-name>
  <uml-attribute>name:String</uml-attribute>
  <uml-attribute>email:String</uml-attribute>
  <uml-attribute>phone:String</uml-attribute>
 </uml-class>
</uml-class-diagram>
```


## Beta version

* Just imported from http://sling.migniot.com/Uml/Uml_0.0.46.html
* For a demo refer to [https://sling.migniot.com/Magasin/Le probleme du magasin_Chap6.html](https://sling.migniot.com/Magasin/Le%20probleme%20du%20magasin_Chap6.html) (FR)

