create table tokens(key string(32) primary key, secret string(32));
create table requests(id string(21) primary key, type tinyint,payment_hash char(64), bolt11 text, expires_at unsigned int, url varchar(32),result text);

