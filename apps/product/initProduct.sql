CREATE DATABASE IF NOT EXISTS product_db;

GRANT ALL PRIVILEGES ON product_db.* TO 'palo'@'%';

FLUSH PRIVILEGES;

USE product_db;

create table category(
	id tinyint unsigned auto_increment primary key,
    slug varchar(50) not null unique
);

create table product (
	id binary(16) primary key default(UUID_TO_BIN(UUID())),
    title varchar(250) not null,
    description text not null,
    price decimal(10,2) not null,
    discount_percentage tinyint unsigned not null default(0),
    stock smallint unsigned not null default(0),
    brand varchar(100) not null,
    weight float not null,
	warranty_info varchar(250),
    shipping_info varchar(250),
    rating_avg decimal(3,2) default(0),
    category_id tinyint unsigned not null,
    thumbnail varchar(500),
    physical boolean not null default(true),
    index idx_stock (stock),
    index idx_category (category_id),
    index idx_price (price),
    index idx_rating (rating_avg),
    fulltext index idx_search (title, description),
    check (price >= 0),
    check (weight >= 0),
    check (discount_percentage between 0 and 100),
    foreign key (category_id) references category(id)
);

create table meta(
	id int unsigned auto_increment primary key,
    account_id binary(16) not null,
    product_id binary(16) not null unique,
    deleted datetime,
    deleted_by binary(16),
    created datetime not null default(current_timestamp()),
    updated timestamp not null default(current_timestamp()),
    index idx_account (account_id),
    index idx_deleted (deleted),
    foreign key (product_id) references product(id) on delete cascade
);

create table tag(
	id smallint unsigned auto_increment primary key,
    title varchar(50) not null unique
);

create table prod_x_tag(
	product_id binary(16) not null,
	tag_id smallint unsigned not null,
    primary key (product_id, tag_id),
    foreign key (product_id) references product(id) on delete cascade,
    foreign key (tag_id) references tag(id) on delete cascade
);

create table image(
	id int unsigned auto_increment primary key,
    product_id binary(16) not null,
    link varchar(500) not null,
    index idx_product (product_id),
    foreign key (product_id) references product(id) on delete cascade
);

create table review(
    product_id binary(16) not null,
    account_id binary(16) not null,
    rating tinyint unsigned not null,
    comment text,
    created datetime not null default(current_timestamp()),
    index idx_account (account_id),
    check (rating between 1 and 10),
    primary key (product_id, account_id),
    foreign key (product_id) references product(id) on delete cascade
);

DELIMITER &&
CREATE TRIGGER trg_update_meta_timestamp
AFTER UPDATE ON product
FOR EACH ROW
BEGIN
  UPDATE meta
  SET updated = CURRENT_TIMESTAMP
  WHERE product_id = NEW.id;
END&&
DELIMITER ;