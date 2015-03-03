var Boom = require("boom");
var Concat = require("concat-stream");
var Image = require("imagemagick-stream");
var Joi = require("joi");
var Lookup = require("object-path");
var LRU = require("bluebird-lru-cache");
var Promise = require("bluebird");
var Screenshot = require("screenshot-stream");


exports.register = function (server, options, next) {

  var runUrl = Lookup.get(options.config, "shared.url.run", "localhost");
  
  var prepareShot = function (key) {
    var plunkId = key.split("@")[0];
    
    return new Promise(function (resolve, reject) {
      var captureStream = Screenshot(runUrl + "/project/" + plunkId + "/", "1024x768", {delay: 2});
      var resizeStream = Image().resize("300").gravity("NorthWest").crop("300x150").quality(90);
      var concatStream = Concat(function (buf) {
        if (!buf.length) {
          return reject(Boom.serverTimeout("Invalid preview, empty buffer"));
        }
        
        resolve(buf);
      });
      
      captureStream
        .pipe(resizeStream)
        .pipe(concatStream)
        .on("error", reject);
    });
  };

  var cache = LRU({
    max: 1024 * 1024 * 256,
    length: function (buf) { return buf.length; },
    fetchFn: prepareShot,
  });

  server.route({
    method: "GET",
    path: "/{plunkId}.png",
    config: {
      validate: {
        params: {
          plunkId: Joi.string().alphanum().required(),
        },
        query: {
          d: Joi.string().required(),
        },
      },
      handler: function (request, reply) {
        cache.get(request.params.plunkId + "@" + request.query.d)
          .then(function (buf) {
            reply(buf).type("image/png");
          }, reply);
      },
    },
  });

  next();
};

exports.register.attributes = {
  pkg: require('./package.json')
};