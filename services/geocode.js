const axios = require("axios");

async function geocodeAdresse(adresseComplete) {
  const url = "https://nominatim.openstreetmap.org/search";

  const { data } = await axios.get(url, {
    params: {
      format: "json",
      q: adresseComplete,
      limit: 1,
    },
    headers: {
      "User-Agent": "event-app-school-project/1.0", // recommandé par Nominatim
    },
  });

  if (!data || !data.length) {
    return null;
  }

  return {
    latitude: parseFloat(data[0].lat),
    longitude: parseFloat(data[0].lon),
  };
}

module.exports = { geocodeAdresse };
