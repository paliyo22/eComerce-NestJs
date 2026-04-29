CREATE DATABASE IF NOT EXISTS order_db;

GRANT ALL PRIVILEGES ON order_db.* TO 'palo'@'%';

FLUSH PRIVILEGES;

USE order_db;

create table purchase_order(
	id binary(16) primary key default(uuid_to_bin(uuid())),
	account_id binary(16) not null,
    draft_order_id binary(16) unique,
    contact_email varchar(100) not null,
	total decimal(10,2) not null,
    shipping varchar(250) not null,
	created datetime not null default(current_timestamp()),
    index idx_account (account_id),
    index idx_date (created)
);

create table draft_order(
	id binary(16) primary key default(uuid_to_bin(uuid())),
	account_id binary(16) not null,
	total decimal(10,2) not null,
	created datetime not null default(current_timestamp()),
    shipping varchar(250) not null,
    order_id binary(16),
    status enum('pending', 'completed', 'failed') not null default('pending'),
	index idx_account (account_id),
	index idx_created (created),
    check (total > 0),
    foreign key (order_id) references purchase_order(id)
);

create table draft_item(
	draft_order_id binary(16) not null,
	product_id binary(16) not null,
    seller_id binary(16) not null,
    product_title varchar(250) not null,
    seller_title varchar(250) not null,
    price decimal(10,2)  not null,
	amount smallint unsigned not null,
    discount_percentage tinyint unsigned not null default(0),
	subtotal decimal(10,2) not null,
    primary key (draft_order_id, product_id),
    check (discount_percentage between 0 and 100),
    check (price >= 0),
    foreign key (draft_order_id) references draft_order(id) on delete cascade
);

create table order_item(
	order_id binary(16) not null,
	product_id binary(16) not null,
    seller_id binary(16) not null,
    product_title varchar(250) not null,
    seller_title varchar(250) not null,
    price decimal(10,2)  not null,
	amount smallint unsigned not null,
    discount_percentage tinyint unsigned not null default(0),
	subtotal decimal(10,2) not null,
    index idx_seller (seller_id),
    index idx_product (product_id),
    index idx_seller_order (seller_id, order_id),
    primary key (order_id, product_id),
    check (discount_percentage between 0 and 100),
    check (price >= 0),
	foreign key (order_id) references purchase_order(id) on delete cascade
);