CREATE TABLE IF NOT EXISTS orders (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER       NOT NULL,
  total       NUMERIC(12,2) NOT NULL CHECK (total >= 0),
  status      VARCHAR(20)   NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'paid', 'shipped', 'cancelled')),
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- product_name and unit_price are snapshots taken at purchase time.
CREATE TABLE IF NOT EXISTS order_items (
  id            SERIAL PRIMARY KEY,
  order_id      INTEGER       NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id    INTEGER       NOT NULL,
  product_name  VARCHAR(150)  NOT NULL,
  unit_price    NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  quantity      INTEGER       NOT NULL CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id);
