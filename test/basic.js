/* global describe */
/* global it */
var should = require('should');

/*
// lib includes
//var Promise = require('bluebird');
var request = Promise.promisifyAll(require('request'));

// lib
var jassa = require('../lib');
// namespaces
var rdf = jassa.rdf;
var vocab = jassa.vocab;
var sparql = jassa.sparql;
var service = jassa.service;
*/

// tests
describe('Basics', function(){
    it('#Triple should be created', function(){
	var foo = 'test';
        var bar = true;
        foo.should.equal('test');
        bar.should.be.true;
    });
});

