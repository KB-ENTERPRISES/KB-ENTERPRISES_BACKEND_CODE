// src/routes/products.js
// Product management and stock catalog endpoints

const router = require('express').Router();
const pool   = require('../db/pool');
const { requireRole } = require('../middleware/auth');

// GET /api/products - Public (retrieve active products catalog)
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, icon, img, price, unit,
              in_stock AS "in_stock",
              case_price AS "case_price",
              pieces_per_case AS "pieces_per_case"
       FROM products
       WHERE deleted = false
       ORDER BY created_at ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error('[GET /products]', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// POST /api/products - Admin Only (add a new product)
router.post('/', ...requireRole('ADMIN'), async (req, res) => {
  const { id, name, icon, img, price, unit, casePrice, piecesPerCase } = req.body;
  if (!name || !price || !unit) {
    return res.status(400).json({ error: 'Name, price, and unit are required' });
  }
  if (typeof price !== 'number' || price < 0) {
    return res.status(400).json({ error: 'Price must be a non-negative number' });
  }
  try {
    const pid = id || 'custom-' + Date.now();
    await pool.query(
      `INSERT INTO products (id, name, icon, img, price, unit, case_price, pieces_per_case, in_stock)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)`,
      [pid, name, icon || '📦', img || '', price, unit, casePrice || null, piecesPerCase || null]
    );
    res.status(201).json({ id: pid, message: 'Product created' });
  } catch (err) {
    console.error('[POST /products]', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// PUT /api/products/:id - Admin Only (update product details)
router.put('/:id', ...requireRole('ADMIN'), async (req, res) => {
  const { id } = req.params;
  const { name, img, price, casePrice, piecesPerCase } = req.body;
  if (!name || !price) {
    return res.status(400).json({ error: 'Name and price are required' });
  }
  if (typeof price !== 'number' || price < 0) {
    return res.status(400).json({ error: 'Price must be a non-negative number' });
  }
  try {
    const { rowCount } = await pool.query(
      `UPDATE products
       SET name = $1, img = $2, price = $3, case_price = $4, pieces_per_case = $5
       WHERE id = $6`,
      [name, img || '', price, casePrice || null, piecesPerCase || null, id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product updated successfully' });
  } catch (err) {
    console.error('[PUT /products/:id]', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// PATCH /api/products/:id/stock - Admin Only (toggle stock status)
router.patch('/:id/stock', ...requireRole('ADMIN'), async (req, res) => {
  const { id } = req.params;
  const { inStock } = req.body;
  if (inStock === undefined) {
    return res.status(400).json({ error: 'inStock status is required' });
  }
  try {
    const { rowCount } = await pool.query(
      `UPDATE products SET in_stock = $1 WHERE id = $2`,
      [inStock, id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Stock status updated' });
  } catch (err) {
    console.error('[PATCH /products/:id/stock]', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// DELETE /api/products/:id - Admin Only (soft-delete a product)
router.delete('/:id', ...requireRole('ADMIN'), async (req, res) => {
  const { id } = req.params;
  try {
    const { rowCount } = await pool.query(
      `UPDATE products SET deleted = true WHERE id = $1`,
      [id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    console.error('[DELETE /products/:id]', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

module.exports = router;
