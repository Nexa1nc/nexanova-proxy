const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.get('/search', async (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.status(400).json({ error: 'Query mancante' });
  }

  try {
    // Usiamo lite.duckduckgo.com che viene bloccato molto meno rispetto alla versione HTML
    const response = await axios.get(`https://lite.duckduckgo.com/lite/`, {
      params: { q: query },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7'
      },
      timeout: 10000 // Timeout di 10 secondi per evitare che la chiamata blocchi Render
    });

    const $ = cheerio.load(response.data);
    const results = [];

    // Estrazione dai risultati della versione Lite di DuckDuckGo
    $('.result-snippet').each((index, element) => {
      const snippet = $(element).text().trim();
      const prevRow = $(element).parent().prev();
      const linkElem = prevRow.find('.result-link');
      
      const title = linkElem.text().trim();
      const url = linkElem.attr('href');

      if (title && url) {
        results.push({
          title: title,
          url: url,
          description: snippet || "Risultato recuperato da NexaNova Proxy."
        });
      }
    });

    // Se per qualche motivo DuckDuckGo risponde 200 ma non trovi risultati nell'HTML
    if (results.length === 0) {
      // Tenta fallback su DuckDuckGo API istantanea
      const apiRes = await axios.get(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`);
      if (apiRes.data && apiRes.data.RelatedTopics) {
        apiRes.data.RelatedTopics.forEach(item => {
          if (item.Text && item.FirstURL) {
            results.push({
              title: item.Text.split(' - ')[0] || item.Text,
              url: item.FirstURL,
              description: item.Text
            });
          }
        });
      }
    }

    res.json({ results: results });

  } catch (error) {
    console.error("Errore durante la ricerca:", error.message);
    res.status(500).json({ 
      error: 'Errore nel recupero dei risultati dal proxy', 
      details: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server NexaNova attivo sulla porta ${PORT}`);
});
