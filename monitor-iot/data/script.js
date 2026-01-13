const status = document.getElementById('status');

document.getElementById('on').onclick = () => {
  fetch('/window/open')
    .then(res => res.text())
    .then(txt => status.textContent = txt);
};

document.getElementById('off').onclick = () => {
  fetch('/window/close')
    .then(res => res.text())
    .then(txt => status.textContent = txt);
};
