import { createRoot } from 'react-dom/client'
import App from './App.jsx'

window.onerror = function(msg, src, line, col, err) {
  document.body.innerHTML = '<pre style="color:red;padding:20px">' + msg + '\n' + src + ':' + line + '</pre>';
}

window.addEventListener('unhandledrejection', function(e) {
  document.body.innerHTML = '<pre style="color:red;padding:20px">' + e.reason + '</pre>';
});

try {
  createRoot(document.getElementById('root')).render(<App />)
} catch(e) {
  document.body.innerHTML = '<pre style="color:red;padding:20px">' + e.message + '\n' + e.stack + '</pre>';
}
