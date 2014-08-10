JSON-LD-ID-Template
===================

Simple templating tool for dynamically generating attributes, such as '@id' and '@type', on the instance level.
It is meant to be used for cases, where the JSON structure is already aligned with the structure of a specific vocabulary, and no further transformations are necessary.

If you need transformations, you may want to check out the (json-ld-macros project)[https://github.com/antoniogarrote/json-ld-macros].

## Example

Let's assume we want to describe which graphs are available in the [DBpedia SPARQL Endpoint](http://dbpedia.org/sparql).
The JSON aligned with the [Service Description Vocabulary](http://www.w3.org/TR/sparql11-service-description/) may look like this:

```javascript
var sdJson =
{
  "endpoint": "http://dbpedia.org/sparql",
  "availableGraphs": [{
    "namedGraph": {
      "name": "http://dbpedia.org",
      "labels": {
        "": "DBpedia",
        "en": "DBpedia"
      }
    }
  }]
};
```


The JSON-LD context is static and can be kept in some place (such as a file or variable):

```javascript
var sdContext = 
{
  "@context": {
    "rdfs": "http://www.w3.org/2000/01/rdf-schema#",
    "sd": "http://www.w3.org/ns/sparql-service-description#",
    "availableGraphs": "sd:availableGraphs",
    "namedGraph": "sd:namedGraph",
    "name": {
      "@id": "sd:name",
      "@type": "@id"
    },
    "labels": {
      "@id": "rdfs:label",
      "@container": "@language"
    }
  }
}
;
```

However, in order to convert our initial data to JSON-LD, we want to be able to create useful URIs.
The following template is used to augment the plain json description with additional '@id' fields.

- Access to attributes in an object ancestor can be done by  simply using `this.myAttribute`. This works, because a copy of the original JSON object is made, with a prototype chain set up.
- Attributes starting with a `$` denote temporary values that will be omitted in the final object.
- Parent functions are evaluated first, so children can access computed values in their parents.
- Actually, this approach is not JSON-LD specific, as fields other than '@id' could be computed this way.
- If an attribute, such as'@id', is computed over an array, you can use `this.$index` to access the index in the javascript array.

```javascript
var sdTemplate = (function(base) {
  // Note that the base URI could be defined in the JSON-LD context as well.
  var base = "http://example.org/resource/";

  return {
    '@type': 'sd:Service',
    '@id': function() {
      this.$serviceUrlEnc = encodeURIComponent(this.endpoint);
      return base + 'service-' + this.$serviceUrlEnc;
    },
    availableGraphs: {
      '@type': 'sd:GraphCollection',
      '@id': function() {
        this.$graphUrlEnc = encodeURIComponent(this.namedGraph.name);
        return base + 'availableGraphs-' + this.$serviceUrlEnc;
      },
      namedGraph: {
        '@type': 'sd:NamedGraph',
        '@id': function() {
          return base + 'namedGraph-' + this.$serviceUrlEnc + '-' + this.$graphUrlEnc; // this.$index would be available here
        },
        name: {
          '@id': function() { return this.name; }
        }
      }
    }
  };
});
```

```javascript

// Create an instance of the template with a specific base URL
var template = sdTemplate('http://example.org/resource/');

// Turn the template into a function that can actually instanciate new objects
var templateFn = JsonLdIdTemplate.compile(template);

// Create an '@id' enriched object for the original JSON
var instanceJsonLd = templateFn(sdJson);

// Create a full JSON-LD object by adding the static JSON-LD context to the instance
var fullJsonLd = _.extend(instanceJsonLd, sdContext);


```

And the JSON-LD converted to turtle:

```html
@prefix rdfs:  <http://www.w3.org/2000/01/rdf-schema#> .
@prefix sd:    <http://www.w3.org/ns/sparql-service-description#> .

<http://example.org/resource/service-http%3A%2F%2Fdbpedia.org%2Fsparql>
        a                   sd:Service ;
        sd:availableGraphs  <http://example.org/resource/availableGraphs-http%3A%2F%2Fdbpedia.org%2Fsparql> .

<http://example.org/resource/availableGraphs-http%3A%2F%2Fdbpedia.org%2Fsparql>
        a              sd:GraphCollection ;
        sd:namedGraph  <http://example.org/resource/namedGraph-http%3A%2F%2Fdbpedia.org%2Fsparql-http%3A%2F%2Fdbpedia.org> .

<http://example.org/resource/namedGraph-http%3A%2F%2Fdbpedia.org%2Fsparql-http%3A%2F%2Fdbpedia.org>
        a           sd:NamedGraph ;
        rdfs:label  "DBpedia"@en , "DBpedia" ;
        sd:name     <http://dbpedia.org> .

```


## Future Work
Add some simple template DSL to allow creating common URI designs inline, such as
```
{
   '@id': '{base}/service-{%this.endpoint}'
}
```

(where {%expr} would e.g. denote component encoding).

