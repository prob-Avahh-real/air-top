const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const root = __dirname.replace(/\/scripts$/, '');
const www = path.join(root, 'www');
const src = path.join(root, 'src');

fs.mkdirSync(www, { recursive: true });

esbuild.buildSync({
  entryPoints: [path.join(src, 'app.js')],
  bundle: true,
  format: 'esm',
  outfile: path.join(www, 'js', 'app.js'),
  sourcemap: true,
  target: ['es2020'],
});

fs.copyFileSync(path.join(root, 'index.html'), path.join(www, 'index.html'));
console.log('Built air-top → www/');
