var jade = require('jade')
  , srcDir = __dirname + '/public/templates'
  , dstPath = __dirname + '/public/js/templates.js'
  , util = require('util')
  , fs = require('fs');

function writeTemplates (templates) {
  var out = '(function () {\n'
  out += 'this.JST = this.JST || {};\n';
  out += '' + templates;
  out += '\n})()';
  fs.writeFile(dstPath, out, 'utf-8', function (err) {
    if (err)
      return console.log('Error compiling: ' + err);
    return console.log('Done!');
  });
}

(function () {
  var out, srcPath, rootName, templates = [];
  fs.readdir(srcDir, function (err, files) {
    files.forEach(function (file) {
      srcPath = srcDir + '/' + file;
      fs.readFile(srcPath, 'utf-8', function (err, content) {
        rootName = file.replace('.jade', '');
        out = 'JST["' + rootName + '"] = ';
        out += jade.compile(content, {client: true, self: true, compileDebug: false});
        templates.push(out);
        if (Object.keys(templates).length === files.length)
          writeTemplates(templates.join('; \n'));
      });
    });
  });
})();
