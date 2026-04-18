-- SaaS production: catalog lives in `saas_products` / `saas_orders`; remove legacy demo table.
DROP TABLE IF EXISTS "test_table";
