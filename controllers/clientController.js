const Client = require('../models/clientModel');

exports.getAllClients = (req, res) => {
  Client.getAll((err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
};

exports.getClientById = (req, res) => {
  const { id } = req.params;
  Client.getById(id, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!result.length) return res.status(404).json({ message: "Client non trouvé" });
    res.json(result[0]);
  });
};

exports.createClient = (req, res) => {
  const data = req.body;
  Client.create(data, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ message: "Client créé", id: result.insertId });
  });
};

exports.updateClient = (req, res) => {
  const { id } = req.params;
  const data = req.body;
  Client.update(id, data, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Client mis à jour" });
  });
};

exports.deleteClient = (req, res) => {
  const { id } = req.params;
  Client.delete(id, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Client supprimé" });
  });
};
