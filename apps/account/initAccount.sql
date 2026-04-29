CREATE DATABASE IF NOT EXISTS account_db;

GRANT ALL PRIVILEGES ON account_db.* TO 'palo'@'%';

FLUSH PRIVILEGES;

USE account_db;

create table status(
	id tinyint unsigned auto_increment primary key,
    slug varchar(50) not null unique
);

create table role(
	id tinyint unsigned auto_increment primary key,
    slug varchar(50) not null unique 
);

create table account(
	id binary(16) primary key default(uuid_to_bin(uuid())),
    email varchar(100) unique not null,
    username varchar(50) unique not null,
    password varchar(255) not null
);

create table user_profile(
	id bigint unsigned auto_increment primary key,
    account_id binary(16) unique not null,
    firstname varchar(50) not null,
    lastname varchar(50) not null,
    birth date,
    phone varchar(50),
	cbu varchar(22),
    check (cbu is null or char_length(cbu) = 22),
    foreign key (account_id) references account(id) on delete cascade
);

create table business_profile(
	id bigint unsigned auto_increment primary key,
    account_id binary(16) unique not null,
    title varchar(50) not null,
    bio text,
    phone varchar(50) not null,
	cbu varchar(22),
    check (cbu is null or char_length(cbu) = 22),
    foreign key (account_id) references account(id) on delete cascade
);

create table admin_profile(
	id bigint unsigned auto_increment primary key,
    account_id binary(16) unique not null,
    public_name varchar(20) unique not null,
    foreign key (account_id) references account(id) on delete cascade
);

create table meta(
	id bigint unsigned auto_increment primary key,
    account_id binary(16) unique not null,
    created datetime not null default(current_timestamp()),
    updated timestamp not null default(current_timestamp()) on update current_timestamp(),
    deleted datetime,
    deleted_by binary(16),
    status_id tinyint unsigned not null default(1),
    role_id tinyint unsigned not null default(1),
    index idx_status (status_id),
	index idx_role (role_id),
    index idx_deleted (deleted),
    foreign key (role_id) references role(id),
    foreign key (account_id) references account(id) on delete cascade,
    foreign key (deleted_by) references account(id),
    foreign key (status_id) references status(id)
);

create table refresh_token(
    account_id binary(16) not null,
    device varchar(255) not null,
    token varchar(1024) not null,
    ip varchar(45) not null,
    created_at datetime default(current_timestamp()),
	expired_at datetime not null,
    primary key (account_id, device),
	index idx_expired (expired_at),
    foreign key (account_id) references account(id) on delete cascade
);

create table store(
	id binary(16) primary key default(uuid_to_bin(uuid())),
    account_id binary(16) not null,
    phone varchar(50) not null,
    index idx_account (account_id),
    foreign key (account_id) references account(id) on delete cascade
);

create table address(
	id binary(16) primary key default(uuid_to_bin(uuid())),
	account_id binary(16),
    store_id binary(16) unique,
	address varchar(100) not null,
	apartment varchar(10),
	city varchar(100) not null,
	zip varchar(10) not null,
	country varchar(100) not null,
    index idx_account (account_id),
    index idx_location (country, city),
    CHECK (
    (account_id IS NOT NULL AND store_id IS NULL) OR
    (account_id IS NULL AND store_id IS NOT NULL)
	),
    foreign key (store_id) references store(id) on delete cascade,
	foreign key (account_id) references account(id) on delete cascade
);

create table balance(
	account_id binary(16) primary key,
    amount decimal(10,2) not null default(0.00),
    status enum('idle', 'processing') not null default('idle'),
	foreign key (account_id) references account(id) on delete cascade
);

create table withdrawal(
	id bigint unsigned auto_increment primary key,
    account_id binary(16) not null,
	amount decimal(10,2) not null,
	cbu varchar(22) not null,
	status enum('pending', 'completed', 'failed') not null default('pending'),
	created datetime not null default(current_timestamp()),
	index idx_account (account_id),
    check(amount > 0),
    foreign key (account_id) references account(id) on delete cascade
);

DELIMITER &&
CREATE TRIGGER withdrawal_guard
BEFORE UPDATE ON withdrawal
FOR EACH ROW
BEGIN
  IF OLD.status != 'pending' THEN
	  SIGNAL SQLSTATE '45000'
	  SET MESSAGE_TEXT = 'Withdrawal already finalized';
  END IF;

  IF NEW.status NOT IN ('completed', 'failed') THEN
	  SIGNAL SQLSTATE '45000'
	  SET MESSAGE_TEXT = 'Invalid status transition';
  END IF;

  IF OLD.account_id != NEW.account_id 
	OR OLD.amount != NEW.amount 
	OR OLD.cbu != NEW.cbu THEN
	SIGNAL SQLSTATE '45000'
  SET MESSAGE_TEXT = 'Immutable fields cannot be modified';
END IF;
END&&
DELIMITER ;

DELIMITER &&
CREATE TRIGGER validate_user_profile_insert
BEFORE INSERT ON user_profile
FOR EACH ROW
BEGIN
  IF EXISTS(SELECT 1 FROM business_profile WHERE account_id = NEW.account_id) 
     OR EXISTS(SELECT 1 FROM admin_profile WHERE account_id = NEW.account_id) THEN
    SIGNAL SQLSTATE '45000' 
    SET MESSAGE_TEXT = 'Account already has a different profile type';
  END IF;
END&&

CREATE TRIGGER validate_user_profile_update
BEFORE UPDATE ON user_profile
FOR EACH ROW
BEGIN
  IF NEW.account_id != OLD.account_id THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Account_id cannot be modified';
  END IF;
END&&

DELIMITER ;

DELIMITER &&
CREATE TRIGGER validate_business_profile_insert
BEFORE INSERT ON business_profile
FOR EACH ROW
BEGIN
  IF EXISTS(SELECT 1 FROM user_profile WHERE account_id = NEW.account_id) 
     OR EXISTS(SELECT 1 FROM admin_profile WHERE account_id = NEW.account_id) THEN
    SIGNAL SQLSTATE '45000' 
    SET MESSAGE_TEXT = 'Account already has a different profile type';
  END IF;
END&&

CREATE TRIGGER validate_business_profile_update
BEFORE UPDATE ON business_profile
FOR EACH ROW
BEGIN
  IF NEW.account_id != OLD.account_id THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Account_id cannot be modified';
  END IF;
END&&
DELIMITER ;

DELIMITER &&
CREATE TRIGGER validate_admin_profile_insert
BEFORE INSERT ON admin_profile
FOR EACH ROW
BEGIN
  IF EXISTS(SELECT 1 FROM user_profile WHERE account_id = NEW.account_id) 
     OR EXISTS(SELECT 1 FROM business_profile WHERE account_id = NEW.account_id) THEN
    SIGNAL SQLSTATE '45000' 
    SET MESSAGE_TEXT = 'Account already has a different profile type';
  END IF;
END&&

CREATE TRIGGER validate_admin_profile_update
BEFORE UPDATE ON admin_profile
FOR EACH ROW
BEGIN
  IF NEW.account_id != OLD.account_id THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Account_id cannot be modified';
  END IF;
END&&
DELIMITER ;

DELIMITER &&
CREATE TRIGGER soft_delete_account
AFTER UPDATE ON meta
FOR EACH ROW
BEGIN
  IF NEW.deleted IS NOT NULL AND OLD.deleted IS NULL THEN
    DELETE FROM refresh_token WHERE account_id = NEW.account_id;
  END IF;
END&&
DELIMITER ;

DELIMITER &&
CREATE TRIGGER change_user_role
AFTER UPDATE ON user_profile
FOR EACH ROW
BEGIN
  IF NEW.phone IS NOT NULL AND OLD.phone IS NULL THEN
    UPDATE meta
    SET role_id = (SELECT id FROM role WHERE slug = 'user-seller')
    WHERE account_id = NEW.account_id;
  END IF;
  IF NEW.phone IS NULL AND OLD.phone IS NOT NULL THEN
    UPDATE meta
    SET role_id = (SELECT id FROM role WHERE slug = 'user')
    WHERE account_id = NEW.account_id;
  END IF;
END&&
DELIMITER ;

DELIMITER &&
CREATE TRIGGER set_default_user_role
AFTER INSERT ON user_profile
FOR EACH ROW
BEGIN
  UPDATE meta
  SET role_id = (SELECT id FROM role WHERE slug = IF(NEW.phone IS NOT NULL, 'user-seller', 'user') LIMIT 1)
  WHERE account_id = NEW.account_id;
END&&
DELIMITER ;

DELIMITER &&
CREATE TRIGGER set_default_business_role
AFTER INSERT ON business_profile
FOR EACH ROW
BEGIN
  UPDATE meta
  SET role_id = (SELECT id FROM role WHERE slug = 'business' LIMIT 1)
  WHERE account_id = NEW.account_id;
END&&
DELIMITER ;

DELIMITER &&
CREATE TRIGGER set_default_admin_role
AFTER INSERT ON admin_profile
FOR EACH ROW
BEGIN
  UPDATE meta
  SET role_id = (SELECT id FROM role WHERE slug = 'admin' LIMIT 1)
  WHERE account_id = NEW.account_id;
END&&
DELIMITER ;

DELIMITER &&
CREATE TRIGGER set_default_user_balance
AFTER INSERT ON user_profile
FOR EACH ROW
BEGIN
  INSERT IGNORE INTO balance (account_id)
  VALUES (NEW.account_id);
END&&
DELIMITER ;

DELIMITER &&
CREATE TRIGGER set_default_business_balance
AFTER INSERT ON business_profile
FOR EACH ROW
BEGIN
  INSERT IGNORE INTO balance (account_id)
  VALUES (NEW.account_id);
END&&
DELIMITER ;

insert into role (slug) values
('pending'), 
('admin'),
('business'),
('user'),
('user-seller');

insert into status (slug) values
('pending'),
('active'),
('suspended'),
('inactive'),
('banned');