const db = require("./db");

const customerCount = db
  .prepare("SELECT COUNT(*) AS count FROM customers")
  .get().count;

if (customerCount > 0) {
  console.log("Database already contains customers. Seed skipped.");
  process.exit(0);
}

const customers = [
  ["Amara Okafor", "amara.okafor@example.com"],
  ["Daniel Adeyemi", "daniel.adeyemi@example.com"],
  ["Tolu Adebayo", "tolu.adebayo@example.com"],
  ["Chiamaka Nwosu", "chiamaka.nwosu@example.com"],
  ["Femi Balogun", "femi.balogun@example.com"],
  ["Zainab Ibrahim", "zainab.ibrahim@example.com"],
  ["Emeka Obi", "emeka.obi@example.com"],
  ["Mariam Yusuf", "mariam.yusuf@example.com"],
  ["Kelechi Eze", "kelechi.eze@example.com"],
  ["Seyi Ogunleye", "seyi.ogunleye@example.com"],
  ["Adaeze Okoro", "adaeze.okoro@example.com"],
  ["Ibrahim Musa", "ibrahim.musa@example.com"],
  ["Nneka Eze", "nneka.eze@example.com"],
  ["David Aluko", "david.aluko@example.com"],
  ["Bola Onifade", "bola.onifade@example.com"],
];

const insertCustomer = db.prepare(`
  INSERT INTO customers (name, email)
  VALUES (?, ?)
`);

const insertOrder = db.prepare(`
  INSERT INTO orders
  (
    order_number,
    customer_id,
    product_name,
    amount,
    order_date,
    is_final_sale,
    issue_type
  )
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const getCustomer = db.prepare(`
  SELECT id FROM customers WHERE email = ?
`);

const seed = db.transaction(() => {
  for (const customer of customers) {
    insertCustomer.run(...customer);
  }

  const orders = [
    [
      "ORD-2026-1048",
      "amara.okafor@example.com",
      "AeroSound Wireless Headphones",
      189,
      "2026-09-18",
      0,
      "damaged",
    ],
    [
      "ORD-2026-0987",
      "amara.okafor@example.com",
      "LumaDesk LED Monitor",
      420,
      "2026-08-12",
      0,
      null,
    ],

    [
      "ORD-2026-1172",
      "daniel.adeyemi@example.com",
      "Northstar 14 Laptop",
      1299,
      "2026-09-21",
      0,
      "incorrect_item",
    ],
    [
      "ORD-2026-0911",
      "daniel.adeyemi@example.com",
      "VoltEdge Power Station",
      699,
      "2026-07-28",
      0,
      null,
    ],

    [
      "ORD-2026-1104",
      "tolu.adebayo@example.com",
      "PulseFit Smartwatch",
      249,
      "2026-09-16",
      1,
      null,
    ],
    [
      "ORD-2026-0823",
      "tolu.adebayo@example.com",
      "EchoView Webcam",
      159,
      "2026-06-15",
      0,
      null,
    ],

    [
      "ORD-2026-1210",
      "chiamaka.nwosu@example.com",
      "Aurelia Mechanical Keyboard",
      145,
      "2026-09-24",
      0,
      "damaged",
    ],
    [
      "ORD-2026-1033",
      "chiamaka.nwosu@example.com",
      "LumaDesk LED Monitor",
      420,
      "2026-08-30",
      0,
      null,
    ],

    [
      "ORD-2026-1156",
      "femi.balogun@example.com",
      "Northstar 14 Laptop",
      1299,
      "2026-09-22",
      0,
      "damaged",
    ],
    [
      "ORD-2026-0719",
      "femi.balogun@example.com",
      "AeroSound Wireless Headphones",
      189,
      "2026-05-12",
      0,
      null,
    ],

    [
      "ORD-2026-1081",
      "zainab.ibrahim@example.com",
      "VoltEdge Power Station",
      699,
      "2026-09-10",
      0,
      "incorrect_item",
    ],
    [
      "ORD-2026-1195",
      "emeka.obi@example.com",
      "Aurelia Mechanical Keyboard",
      145,
      "2026-09-23",
      0,
      null,
    ],

    [
      "ORD-2026-1014",
      "mariam.yusuf@example.com",
      "EchoView Webcam",
      159,
      "2026-08-20",
      0,
      null,
    ],
    [
      "ORD-2026-1163",
      "kelechi.eze@example.com",
      "PulseFit Smartwatch",
      249,
      "2026-09-20",
      0,
      "damaged",
    ],

    [
      "ORD-2026-0955",
      "seyi.ogunleye@example.com",
      "LumaDesk LED Monitor",
      420,
      "2026-08-05",
      0,
      null,
    ],
    [
      "ORD-2026-1139",
      "adaeze.okoro@example.com",
      "AeroSound Wireless Headphones",
      189,
      "2026-09-19",
      0,
      "incorrect_item",
    ],

    [
      "ORD-2026-0876",
      "ibrahim.musa@example.com",
      "Northstar 14 Laptop",
      1299,
      "2026-06-22",
      0,
      null,
    ],
    [
      "ORD-2026-1092",
      "nneka.eze@example.com",
      "VoltEdge Power Station",
      699,
      "2026-09-14",
      0,
      null,
    ],

    [
      "ORD-2026-1188",
      "david.aluko@example.com",
      "Aurelia Mechanical Keyboard",
      145,
      "2026-09-23",
      1,
      null,
    ],
    [
      "ORD-2026-1117",
      "bola.onifade@example.com",
      "PulseFit Smartwatch",
      249,
      "2026-09-17",
      0,
      "damaged",
    ],
  ];

  for (const order of orders) {
    const customer = getCustomer.get(order[1]);

    if (!customer) {
      throw new Error(`Customer not found for email: ${order[1]}`);
    }

    insertOrder.run(
      order[0],
      customer.id,
      order[2],
      order[3],
      order[4],
      order[5],
      order[6]
    );
  }
});

seed();

console.log("Database seeded: 15 customers, 20 orders.");
