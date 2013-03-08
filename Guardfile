# A sample Guardfile
# More info at https://github.com/guard/guard#readme

# Add files and commands to this file, like the example:
#   watch(%r{file/path}) { `command(s)` }
#
$pid = -1
guard 'shell' do
  watch(/^(app.js|lib.*\.js)$/) do
    Process.kill('KILL', $pid) if $pid > 1
    $pid = fork do
      exec "node app.js"
    end
  end
  watch(/^public_src\/.*\.js$/) {|m| `./build_assets.sh`}
end
