# A sample Guardfile
# More info at https://github.com/guard/guard#readme

# Add files and commands to this file, like the example:
#   watch(%r{file/path}) { `command(s)` }
#
guard 'shell' do
  watch(/^(app.js|lib.*\.js)$/) do
    pid_to_kill = File.read('.app_pid') rescue nil
    Process.kill("KILL", pid_to_kill.to_i) if pid_to_kill
    pid_to_save = Process.spawn("node app.js")
    File.write('.app_pid', pid_to_save)
  end
  watch(/^assets\/js\/((?!vendor).)*\.js$/) {|m| `./node_modules/.bin/browserify --debug assets/js/app.js > public/js/app.js`; puts 'app'}
  watch(/^assets\/js\/vendor\/.*\.js$/) {|m| `./node_modules/.bin/browserify assets/js/vendor.js > public/js/vendor.js`; puts 'vendor'}
  watch(/^assets\/js\/vendor\.js$/) {|m| `./node_modules/.bin/browserify assets/js/vendor.js > public/js/vendor.js`; puts 'vendor'}
  watch(/^assets\/templates\/.*$/) {|m| `node compile_templates.js`; puts 'templates'}
  watch(/^assets\/sass\/.*$/) do |m|
    `cd assets/sass && ../../node_modules/.bin/node-sass main.sass`
    `mv ./assets/sass/nodesass.css ./public/css/main.css`
    puts 'sass'
  end
end
