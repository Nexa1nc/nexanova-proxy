const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 3000;

// Permette al tuo sito HTML di fare richieste a questo server senza blocchi CORS
app.use(cors());

app.get('/search', async (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.status(400).json({ error: 'Query mancante' });
  }

  try {
    // Effettua lo scraping della versione HTML di DuckDuckGo
    const response = await axios.get(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const results = [];

    $('.result').each((index, element) => {
      const title = $(element).find('.result__title').text().trim();
      const rawUrl = $(element).find('.result__url').attr('href');
      const snippet = $(element).find('.result__snippet').text().trim();

      if (title && rawUrl) {
        // Pulisce eventuali redirect di DuckDuckGo per estrarre l'URL finale
        let cleanUrl = rawUrl;
        if (rawUrl.includes('uddg=')) {
          cleanUrl = decodeURIComponent(rawUrl.split('uddg=')[1].split('&')[0]);
        }

        results.push({
          title: title,
          url: cleanUrl,
          description: snippet || "Risultato recuperato da NexaNova Proxy."
        });
      }
    });

    res.json({ results: results });

  } catch (error) {
    console.error("Errore durante lo scraping:", error.message);
    res.status(500).json({ error: 'Errore nel recupero dei risultati', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server NexaNova Proxy attivo sulla porta ${PORT}`);
});