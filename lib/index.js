var DD = require("node-dogstatsd").StatsD;

/**
 * createConnectDatadogMiddleware
 *
 * Returns connect middleware given the options and StatsD client arguments.
 * @param {object} options - Middleware configuration
 * @param {...string|number|object} clientArgs - Arguments for the StatsD Client constructor
 *                                               (host, port, socket, options)
 * @return {function} middleware
 */
module.exports = function createConnectDatadogMiddleware (options, ...clientArgs) {
  var datadog = options.dogstatsd || new DD(...clientArgs);
  var stat = options.stat || "buffer.server";
  var tags = options.tags || [];
  var path = options.path || false;
  var base_url = options.base_url || false;
  var response_code = options.response_code || false;
  var statsCallback = options.statsCallback || false;
  var sampleRate = options.sampleRate || 1;
  var bufferRPC = options.bufferRPC || false;

  return function (req, res, next) {
    if (!req._startTime) {
      req._startTime = new Date();
    }

    var end = res.end;
    res.end = function (chunk, encoding) {
      res.end = end;
      res.end(chunk, encoding);

      if (!req.route || !req.route.path) {
        return;
      }

      var baseUrl = (base_url !== false) ? req.baseUrl : '';
      var statTags = [
        "route:" + baseUrl + req.route.path
      ].concat(tags);

      if (options.method) {
        statTags.push("method:" + req.method.toLowerCase());
      }

      if (options.protocol && req.protocol) {
        statTags.push("protocol:" + req.protocol);
      }

      if (path !== false) {
        statTags.push("path:" + baseUrl + req.path);
      }

      if (bufferRPC && req.body && req.body.name) {
        statTags.push('rpc:' + req.body.name);
      }

      if (response_code) {
        statTags.push("response_code:" + res.statusCode);
      }

      if (statsCallback && typeof statsCallback === 'function') {
        statsCallback(datadog, stat, sampleRate, statTags, req, res);
      }
    };

    next();
  };
};
