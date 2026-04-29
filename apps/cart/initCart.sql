CREATE DATABASE IF NOT EXISTS cart_db;

GRANT ALL PRIVILEGES ON cart_db.* TO 'palo'@'%';

FLUSH PRIVILEGES;

USE cart_db;

create table cart(
	id binary(16) primary key default(uuid_to_bin(uuid())),
	account_id binary(16) not null unique,
	created datetime not null default(current_timestamp()),
	updated timestamp not null default(current_timestamp())
);

create table cart_x_product(
	id binary(16) primary key default(uuid_to_bin(uuid())),
	cart_id binary(16) not null,
	product_id binary(16) not null,
	amount smallint unsigned not null,
    index idx_cart (cart_id),
    check (amount > 0),
	unique (cart_id, product_id),
	foreign key (cart_id) references cart(id) on delete cascade
);

DELIMITER &&
CREATE TRIGGER trg_update_cart_timestamp
AFTER INSERT ON cart_x_product
FOR EACH ROW
BEGIN
  UPDATE cart
  SET updated = CURRENT_TIMESTAMP
  WHERE id = NEW.cart_id;
END&&

CREATE TRIGGER trg_update_cart_timestamp_on_update
AFTER UPDATE ON cart_x_product
FOR EACH ROW
BEGIN
  UPDATE cart
  SET updated = CURRENT_TIMESTAMP
  WHERE id = NEW.cart_id;
END&&

CREATE TRIGGER trg_update_cart_timestamp_on_delete
AFTER DELETE ON cart_x_product
FOR EACH ROW
BEGIN
  UPDATE cart
  SET updated = CURRENT_TIMESTAMP
  WHERE id = OLD.cart_id;
END&&
DELIMITER ;