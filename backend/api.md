# API endpoints

## Base url : <http://127.0.0.1:3000>

## Header : application/json + Authorization: Bearer <JWT>

# /register POST

- Request

```
{
"name": "Ion Pop",
"email": "ion.pop@example.com",
"password": "Parola123!",
"role": "Untrusted",
"tara": "RO",
"oras": "București"
}
```

- Response

```
{
"token": "<jwt>",
"user": {
"id": "...",
"name": "Ion Pop",
"email": "ion.pop@example.com",
"role": "Untrusted",
"tara": "RO",
"oras": "București"
}
```

# /login POST

- Request

```
{ "email": "ana@example.com", "password": "Passw0rd!" }
```

- Response

```
{
"token": "<jwt>",
"user": { "id": "...", "name": "Ana Trusted", "email": "ana@example.com", "role": "Trusted" }
}
```

# /users GET

- Request -> empty
- Response

```
[
{"id":"...","name":"Ana Trusted","email":"ana@example.com","role":"Trusted","tara":"RO","oras":"București"},
{"id":"...","name":"Mihai Untrusted","email":"mihai@example.com","role":"Untrusted","tara":"RO","oras":"Cluj-Napoca"}
]
```

# /products GET

- Request -> empty
- Response

```
[
  {
  "id":"...",
  "title":"Carte JS pentru Începători",
  "description":"...",
  "price":120,
  "seller":"<userId>",
  "category":"Books"
  }
]
```

# /crawler POST

- Request

```
{
  "text": "i want to search about the iphone 17"
}
```

- Response

```
{
  "links": [
    {
      "url": "https://www.apple.com/",
      "title": "Apple - iPhone",
      "reason": "Official website of Apple, the manufacturer of iPhone, likely to have information about iPhone 17."
    },
    {
      "url": "https://www.macrumors.com/roundup/iphone-17/",
      "title": "iPhone 17: Everything We Know",
      "reason": "MacRumors is a reputable source for Apple news and rumors, providing detailed information about iPhone 17."
    },
    {
      "url": "https://www.theverge.com/iphone-17-specs-release-date-price",
      "title": "iPhone 17: Specs, Release Date, Price, and More",
      "reason": "The Verge is a reputable tech news outlet known for its in-depth coverage of Apple products, including iPhone 17."
    },
    {
      "url": "https://www.cnet.com/iphone-17/",
      "title": "iPhone 17: Latest News and Rumors",
      "reason": "CNET is a trusted source for tech news and reviews, offering the latest updates and rumors about iPhone 17."
    },
    {
      "url": "https://www.techradar.com/news/iphone-17",
      "title": "iPhone 17: All the latest news and rumors",
      "reason": "TechRadar is a well-known tech publication providing up-to-date news and rumors about iPhone 17."
    }
  ]
}
```

# /msg POST

- Request

```
{ "text": "specificatii BMW i4 eDrive40" }
```

- Response

```
{ "message": "BMW i4 eDrive40 — autonomie ~590 km WLTP, 340 CP, 0–100 km/h 5.7s, RWD, baterie ~83.9 kWh." }
```
