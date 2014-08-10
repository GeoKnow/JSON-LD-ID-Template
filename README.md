JSON-LD-ID-Template
===================

Simple templating tool for dynamically generating '@id' attributes of instances.

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
    "availableGraphs": "http://www.w3.org/ns/sparql-service-description#availableGraphs",
    "namedGraph": "http://www.w3.org/ns/sparql-service-description#namedGraph",
      "name": {
        "@id": "http://www.w3.org/ns/sparql-service-description#name",
        "@type": "@id"
      },
    "labels": {
      "@id": "rdfs:label",
      "@container": "@language"
    }
  }
};
```

However, in order to convert our initial data to JSON-LD, we want to be able to create useful URIs.
The following template is used to augment the plain json description with additional '@id' fields.

- Access to attributes in an object ancestor can be done by  simply using `this.myAttribute`. This works, because a copy of the original JSON object is made, with a prototype chain set up.
- Attributes starting with a `$` denote temporary values that will be omitted in the final object.
- Parent functions are evaluated first, so children can access computed values in their parents.
- Actually, this approach is not JSON-LD specific, as fields other than '@id' could be computed this way.

```javascript
var sdTemplate = (function(base) {
  var base = "http://example.org/resource/";

  return {
    '@id': function() {
      this.$serviceUrlEnc = encodeURIComponent(this.endpoint);
      return base + 'service-' + this.$serviceUrlEnc;
    },
    availableGraphs: {
      '@id': function() {
        this.$graphUrlEnc = encodeURIComponent(this.namedGraph.name);
        return base + 'availableGraphs-' + this.$serviceUrlEnc;
      },
      namedGraph: {
        '@id': function() {
          return base + 'namedGraph-' + this.$serviceUrlEnc + '-' + this.$graphUrlEnc;
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


## Future Work
Add some simple template DSL to allow creating common URI designs inline, such as
```
{
   '@id': '{base}/service-{%this.endpoint}'
}
```

(where {%expr} would e.g. denote component encoding).

