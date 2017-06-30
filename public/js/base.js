var map = {};
onkeydown = onkeyup = function(e){
	map[e.keyCode] = e.type == 'keydown';
	if(map[91] && map[83]){
		document.getElementById("nav").classList.add('flash');
		window.setTimeout(function() {
			document.getElementById("nav").classList.remove('flash');
		}, 300)
		map = {};
	}
}

const {shell} = require('electron')

document.addEventListener('click', (event) => {
  if (event.target.href) {
    // Open links in external browser
    shell.openExternal(event.target.href)
    event.preventDefault()
  } else if (event.target.classList.contains('refresh')) {
    if (confirm('Are you sure? \nAll code will be cleared')) {
      location.reload(); }
  } else if (event.target.classList.contains('quit')) {
    window.close()
  }
})