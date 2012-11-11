var jade = require('jade')
  , ejs = require('ejs')
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
  var ext
  ,   tplLibrary;
  fs.readdir(srcDir, function (err, files) {
    files.forEach(function (file) {
      if (ext = file.match(/(\.(ejs|jade))$/)) {
        ext = ext[1];
        srcPath = srcDir + '/' + file;
        (function (ext, srcPath) {
          fs.readFile(srcPath, 'utf-8', function (err, content) {
            rootName = file.replace(ext, '');
            out = 'JST["' + rootName + '"] = ';
            tplLibrary = eval(ext.replace(/\./,''));
            out += tplLibrary.compile(content, {client: true, compileDebug: false});
            templates.push(out);
            //if we have processed all the templates, write the resulting file
            if (Object.keys(templates).length === files.length) {
              writeTemplates(templates.join('; \n'));
            }
          });
        })(ext, srcPath);
      }
    });
  });
})();
