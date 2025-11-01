# Table of contents
<!--toc:start-->
- [API](#you-can-find-api-endpoints-in-api.md)
- [Tehnologii](#tehnologii)
- [How to run](#how-to-run)
- [Tabele](#tabele)
- [Descriere tabele](#descriere-tabele)
  - [User](#user)
  - [Product](#product)
  - [Order](#order)
  - [Review](#review)
  - [Notification](#notification)
<!--toc:end-->
# You can find API endpoints in api.md

# Tehnologii

- Express
- OpenAI API

# How to run

- First make the .env file the same as env.example

- Install dependencies

```
npm install
```

- Run it

```
npm run dev
```

# Tabele

- *User*
- *Product*
- *Order*
- *Review*
- *Notification*

# Descriere tabele

## User  

```

id: GUID
name: string
email: string
password: string (hased)
role: enum 2 tipuri -> Trusted / Untrusted (doar cel trusted poate vinde)
products: LIST relatie 1-n cu tabela de products
orders: LIST relatie 1-n cu tabela de orders
tara: enum cu tari
oras: enum cu toate orasele - sa poti face filtrare

```

## Product

```

id: GUID
title: string
description: string
price: int
seller: GUID (id-ul de la user, relatie 1-n cu tabela de users)
reviews: LIST (relatie 1-n cu tabela de reviews)
category ( enum 5 feluri de exemplu)

```

## Order

```

id: GUID
buyer: GUID(id-ul la cumparator)
pret: int
status: ENUM pending / paid / shipped / delivered

```

## Review

```

id: GUID
produs: GUID(1-n fata de product)
user: GUID (id-ul userului relatie 1-n cu users)
rating: ENUM 1-5
comment: string

```

## Notification

```

id_user: GUID
message: string
notifcation_type: ENUM order / payment / review / system
is_read: bool true apare ca si citit, false apare mare popup cand deschide aplicatia
created_at: date

```
