#!/usr/bin/env node

var _     = require('lodash'),
    fs    = require('fs'),
    util  = require('util'),
    path  = require('path'),
    PEG   = require('pegjs'),
    cli   = require('commander');

cli
  .version('0.0.1')
  .description('Compile your whenever files by passing the path to the file')
  .parse(process.argv);

// Find the files
var file = fs.readFileSync(cli.args[0]);


// Use the grammar to make a parser

var grammar = fs.readFileSync(__dirname + '/lib/grammar.txt').toString(),
    parser  = PEG.buildParser(grammar),
    bag     = parser.parse(file.toString());

// console.log(bag);

// Start Whenevering!

var master = {},
    sumStatements = 0,
    addedCurrStatement,
    currStatement;

function getFuncFromString(str) {
  return master[str].fn;
}

function convertPredicate(pred){
  return _.isString(pred) ? master[pred].numCopies > 0 : pred;
}

function convertFn(fn){
  return _.isString(fn) ? getFuncFromString(fn) : fn;
}

function addCurrStatement(){
  if (!currStatement) {
    return console.log('ERROR: current statement unknown...');
  }

  if (!addedCurrStatement) {
    addedCurrStatement = true;
    master[currStatement].numCopies++;
    sumStatements++;
  }
}

function getStatement(num){

  var keys = Object.keys(master),
      index = 0,
      counter = master[keys[index]].numCopies;

  while (counter < num) {
    index++;
    counter += master[keys[index]].numCopies
  }

  return master[keys[index]].fn;

}

// Built-in whenever funcs

function add(fnName, times){
  var times = times || 1;
  master[fnName].numCopies += times;
  sumStatements += times;
}

function remove(fnName, times){
  var times = times || 1;

  if (master[fnName].numCopies > 0){
    master[fnName].numCopies -= times;
    sumStatements -= times;
  }
}

function defer(predicate, fn) {
  var fn        = convertFn(fn),
      predicate = convertPredicate(predicate);

  if (!predicate) {
    fn();
  } else {
    addCurrStatement();
  }
}

function again(predicate, fnName){
  var predicate = convertPredicate(predicate);

  if (predicate){
    addCurrStatement();
  }
}


function N(fnName) {
  return master[fnName].numCopies;
}


// Ready, set ...

function deStringifyAndRun(arr) {
  var cleaned = _.pull(arr, 'comment');

  sumStatements = cleaned.length;

  _.forEach(cleaned, function(el){
    eval('var moo = ' + el);
    master[moo.name] = {
      fn: moo,
      timesCalled: 0,
      numCopies: 1
    };
  });

  run();
}

function run() {
  while(sumStatements > 0) {

    var randIndex = Math.ceil(Math.random() * sumStatements),
        randFn = getStatement(randIndex);

    // globals used during execution
    currStatement = randFn.name;
    addedCurrStatement = false;

    // update counting properties (this *must* occur before calling fn)
    remove(currStatement);
    master[currStatement].timesCalled++;

    randFn();

  }

  console.log('FIN: THE BAG IS EMPTY');
}


// Go!

deStringifyAndRun(bag);
