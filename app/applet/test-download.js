import https from 'https';
import fs from 'fs';

function download(url) {
  console.log('Downloading from:', url);
  https.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    }
  }, (res) => {
    console.log('Status code:', res.statusCode);
    if (res.statusCode === 302 || res.statusCode === 301) {
      console.log('Redirecting to:', res.headers.location);
      download(res.headers.location);
    } else if (res.statusCode === 200) {
      const file = fs.createWriteStream('repo.zip');
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log('Download completed successfully.');
      });
    } else {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log('Response body:', data.slice(0, 500));
      });
    }
  }).on('error', (err) => {
    console.error('Error:', err.message);
  });
}

// Try main first
download('https://github.com/FairJT/Salon-Updated/archive/refs/heads/main.zip');
