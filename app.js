var Hapi = require("hapi");
var Lookup = require("object-path");
var _ = require("lodash");

var server = new Hapi.Server({
  connections: {
    routes: {
      json: {
        space: 2,
      },
    },
  },
});

var config = _.defaults(require("./config"), {
  plugins: {},
});

var plugins = [
  {
    register: require("good"),
    options: {
      opsInterval: 1000 * 30,
      reporters: [{
        reporter: require('good-console'),
        args:[{ log: '*', error: '*', ops: '*' }]
      }],
    }
  }, {
    register: require("./index"),
    options: { config: config },
  }
];

server.connection({
  host: Lookup.get(config, "services.shot.public.host", "localhost"),
  address: "0.0.0.0",
  port: Lookup.get(config, "services.shot.local.port", 8080),
  labels: ["shot"],
});

server.register(plugins, function (err) {
  if (err) {
    server.log("error", "Error registering plugins: " + err.message, err);
    process.exit(1);
  }
  
  server.start(function (err) {
    if (err) {
      server.log("error", "Error starting server: " + err.message, err);
      process.exit(1);
    }
    
    server.log("info", "Server running at: " + server.info.uri);
  });
  
});