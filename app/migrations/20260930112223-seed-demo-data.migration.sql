-- seed demo data: two logins, three suppliers, forty products, four orders
/** @env development */

insert into users (email, name, role, passwordHash) values
  ('maya@pallethaven.shop', 'Maya Okafor', 'manager', crypt('pallet-demo', genSalt('bf', 12))),
  ('leo@pallethaven.shop', 'Leo Park', 'staff', crypt('pallet-demo', genSalt('bf', 12)));

insert into suppliers (name, contactName, email) values
  ('Cedar & Pine Home Goods', 'Hannah Cole', 'orders@cedarpine.example'),
  ('Brightline Electrical Co.', 'Marcus Reid', 'sales@brightline.example'),
  ('Harbor Pantry Wholesale', 'Priya Nair', 'orders@harborpantry.example');

insert into products (sku, name, supplierId, costCents, onHand, reorderPoint)
select v.sku, v.name, s.id, v.costCents, v.onHand, v.reorderPoint
from (values
  ('CP-1001', 'Linen Tea Towel, set of 2', 'Cedar & Pine Home Goods', 899, 34, 12),
  ('CP-1002', 'Stoneware Mug, Oat', 'Cedar & Pine Home Goods', 650, 8, 18),
  ('CP-1003', 'Beeswax Candle, 8oz', 'Cedar & Pine Home Goods', 1150, 22, 10),
  ('CP-1004', 'Cotton Throw Blanket', 'Cedar & Pine Home Goods', 2875, 6, 6),
  ('CP-1005', 'Ceramic Planter, Small', 'Cedar & Pine Home Goods', 780, 41, 15),
  ('CP-1006', 'Ceramic Planter, Large', 'Cedar & Pine Home Goods', 1640, 3, 8),
  ('CP-1007', 'Woven Storage Basket', 'Cedar & Pine Home Goods', 1320, 17, 8),
  ('CP-1008', 'Glass Carafe, 1L', 'Cedar & Pine Home Goods', 990, 12, 10),
  ('CP-1009', 'Acacia Serving Board', 'Cedar & Pine Home Goods', 1875, 9, 6),
  ('CP-1010', 'Wool Dryer Balls, 6 pack', 'Cedar & Pine Home Goods', 540, 2, 12),
  ('CP-1011', 'Scented Reed Diffuser', 'Cedar & Pine Home Goods', 1260, 25, 10),
  ('CP-1012', 'Enamel Pie Dish', 'Cedar & Pine Home Goods', 1040, 14, 6),
  ('CP-1013', 'Cotton Napkins, set of 4', 'Cedar & Pine Home Goods', 1180, 30, 10),
  ('BL-2001', 'LED Bulb A19, 4 pack', 'Brightline Electrical Co.', 780, 52, 20),
  ('BL-2002', 'LED Candelabra Bulb, 2 pack', 'Brightline Electrical Co.', 560, 11, 15),
  ('BL-2003', 'Extension Cord, 6ft', 'Brightline Electrical Co.', 640, 23, 10),
  ('BL-2004', 'Power Strip, 6 outlet', 'Brightline Electrical Co.', 1190, 5, 8),
  ('BL-2005', 'AA Batteries, 8 pack', 'Brightline Electrical Co.', 720, 64, 30),
  ('BL-2006', 'AAA Batteries, 8 pack', 'Brightline Electrical Co.', 720, 18, 30),
  ('BL-2007', 'USB-C Wall Charger, 20W', 'Brightline Electrical Co.', 1150, 16, 8),
  ('BL-2008', 'USB-C Cable, 2m', 'Brightline Electrical Co.', 480, 27, 12),
  ('BL-2009', 'Motion Sensor Night Light', 'Brightline Electrical Co.', 890, 7, 6),
  ('BL-2010', 'String Lights, Warm White 10m', 'Brightline Electrical Co.', 1490, 13, 6),
  ('BL-2011', 'Smart Plug', 'Brightline Electrical Co.', 1260, 0, 6),
  ('BL-2012', 'Rechargeable Flashlight', 'Brightline Electrical Co.', 1680, 10, 5),
  ('BL-2013', 'Outlet Timer', 'Brightline Electrical Co.', 830, 9, 4),
  ('HP-3001', 'Arabica Coffee Beans, 1lb', 'Harbor Pantry Wholesale', 940, 26, 15),
  ('HP-3002', 'Loose Leaf Earl Grey, 4oz', 'Harbor Pantry Wholesale', 610, 9, 10),
  ('HP-3003', 'Raw Wildflower Honey, 12oz', 'Harbor Pantry Wholesale', 780, 19, 10),
  ('HP-3004', 'Sea Salt Flakes, 8oz', 'Harbor Pantry Wholesale', 450, 33, 12),
  ('HP-3005', 'Extra Virgin Olive Oil, 500ml', 'Harbor Pantry Wholesale', 1120, 4, 10),
  ('HP-3006', 'Dark Chocolate Bar, 72%', 'Harbor Pantry Wholesale', 290, 58, 24),
  ('HP-3007', 'Maple Syrup, 250ml', 'Harbor Pantry Wholesale', 990, 12, 8),
  ('HP-3008', 'Bronze Cut Pasta, 1lb', 'Harbor Pantry Wholesale', 380, 44, 20),
  ('HP-3009', 'Strawberry Preserves, 10oz', 'Harbor Pantry Wholesale', 560, 7, 8),
  ('HP-3010', 'Chili Crisp, 6oz', 'Harbor Pantry Wholesale', 720, 15, 10),
  ('HP-3011', 'Rosemary Oat Crackers', 'Harbor Pantry Wholesale', 410, 21, 12),
  ('HP-3012', 'Ceremonial Matcha, 1oz', 'Harbor Pantry Wholesale', 1350, 3, 5),
  ('HP-3013', 'Aged Balsamic Vinegar, 250ml', 'Harbor Pantry Wholesale', 860, 11, 6),
  ('HP-3014', 'Almond Butter, 12oz', 'Harbor Pantry Wholesale', 870, 16, 8)
) as v (sku, name, supplierName, costCents, onHand, reorderPoint)
join suppliers s on s.name = v.supplierName;

-- Four orders, one in each status.
insert into purchaseOrders (number, supplierId, status, createdByName, createdAt, sentAt, receivedAt)
select v.number, s.id, v.status::poStatus, 'Maya Okafor', v.createdAt, v.sentAt, v.receivedAt
from (values
  (1001, 'Cedar & Pine Home Goods', 'received', now() - interval '14 days', now() - interval '13 days', now() - interval '9 days'),
  (1002, 'Harbor Pantry Wholesale', 'partially_received', now() - interval '6 days', now() - interval '5 days', null),
  (1003, 'Brightline Electrical Co.', 'sent', now() - interval '2 days', now() - interval '1 day', null),
  (1004, 'Cedar & Pine Home Goods', 'draft', now() - interval '3 hours', null, null)
) as v (number, supplierName, status, createdAt, sentAt, receivedAt)
join suppliers s on s.name = v.supplierName;

select setval(pg_get_serial_sequence('purchaseOrders', 'number'), 1004);

insert into poLines (purchaseOrderId, productId, quantityOrdered, quantityReceived, unitCostCents)
select po.id, p.id, v.ordered, v.received, p.costCents
from (values
  (1001, 'CP-1001', 24, 24),
  (1001, 'CP-1005', 30, 30),
  (1001, 'CP-1011', 20, 20),
  (1002, 'HP-3001', 24, 24),
  (1002, 'HP-3006', 48, 24),
  (1002, 'HP-3005', 18, 0),
  (1003, 'BL-2006', 36, 0),
  (1003, 'BL-2011', 12, 0),
  (1003, 'BL-2004', 12, 0),
  (1004, 'CP-1002', 28, 0),
  (1004, 'CP-1006', 13, 0)
) as v (number, sku, ordered, received)
join purchaseOrders po on po.number = v.number
join products p on p.sku = v.sku;

-- Movement history. Receipts, sales, damage and recounts first; then an
-- opening stock count three weeks back that makes every product's history
-- add up to its on-hand quantity today.
insert into stockMovements (productId, delta, quantityAfter, reason, note, userName, purchaseOrderId, createdAt)
select p.id, v.delta, 0, v.reason::movementReason, v.note, v.userName, po.id, now() - v.ago
from (values
  ('CP-1001', 24, 'receipt', '', 'Leo Park', 1001, interval '9 days'),
  ('CP-1005', 30, 'receipt', '', 'Leo Park', 1001, interval '9 days'),
  ('CP-1011', 20, 'receipt', '', 'Leo Park', 1001, interval '9 days'),
  ('HP-3001', 24, 'receipt', '', 'Leo Park', 1002, interval '2 days'),
  ('HP-3006', 24, 'receipt', 'second carton due next week', 'Leo Park', 1002, interval '2 days'),
  ('CP-1001', -6, 'sale', 'weekend market order', 'Leo Park', null, interval '4 days'),
  ('CP-1002', -9, 'sale', 'office gift order', 'Maya Okafor', null, interval '11 days'),
  ('CP-1002', -4, 'sale', '', 'Leo Park', null, interval '5 days'),
  ('CP-1002', -2, 'damage', 'chipped in the stockroom', 'Leo Park', null, interval '3 days'),
  ('CP-1004', -3, 'sale', '', 'Leo Park', null, interval '7 days'),
  ('CP-1006', -5, 'sale', '', 'Leo Park', null, interval '10 days'),
  ('CP-1006', -1, 'damage', 'cracked on delivery', 'Leo Park', null, interval '6 days'),
  ('CP-1010', -8, 'sale', '', 'Leo Park', null, interval '8 days'),
  ('CP-1010', -2, 'count', 'weekly cycle count', 'Maya Okafor', null, interval '1 day'),
  ('BL-2002', -6, 'sale', '', 'Leo Park', null, interval '6 days'),
  ('BL-2004', -4, 'sale', '', 'Leo Park', null, interval '9 days'),
  ('BL-2006', -14, 'sale', 'holiday toy rush', 'Leo Park', null, interval '4 days'),
  ('BL-2011', -5, 'sale', '', 'Leo Park', null, interval '12 days'),
  ('BL-2011', -1, 'damage', 'returned faulty, not resellable', 'Maya Okafor', null, interval '2 days'),
  ('HP-3002', -7, 'sale', '', 'Leo Park', null, interval '5 days'),
  ('HP-3005', -8, 'sale', '', 'Leo Park', null, interval '6 days'),
  ('HP-3005', -1, 'damage', 'leaking bottle', 'Leo Park', null, interval '3 days'),
  ('HP-3009', -5, 'sale', '', 'Leo Park', null, interval '4 days'),
  ('HP-3012', -4, 'sale', '', 'Leo Park', null, interval '7 days'),
  ('HP-3006', -10, 'sale', '', 'Leo Park', null, interval '1 day'),
  ('BL-2005', 2, 'count', 'found a case behind the shelf', 'Maya Okafor', null, interval '1 day')
) as v (sku, delta, reason, note, userName, number, ago)
join products p on p.sku = v.sku
left join purchaseOrders po on po.number = v.number;

insert into stockMovements (productId, delta, quantityAfter, reason, note, userName, createdAt)
select p.id, p.onHand - coalesce(sum(m.delta), 0), 0, 'count', 'opening stock count', 'Maya Okafor', now() - interval '21 days'
from products p
left join stockMovements m on m.productId = p.id
group by p.id;

update stockMovements m
set quantityAfter = running.total
from (
  select id, sum(delta) over (partition by productId order by createdAt, id) as total
  from stockMovements
) running
where running.id = m.id;
