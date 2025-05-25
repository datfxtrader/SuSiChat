
from .RapidDataProviderBase import RapidDataProviderBase, EndpointSchema


class NewsDataProvider(RapidDataProviderBase):
    def __init__(self):
        base_url = "https://newsdata-api.p.rapidapi.com"
        
        endpoints = {
            "latest": EndpointSchema(
                route="/news",
                method="GET",
                name="Latest News",
                description="Get the latest news articles",
                payload={
                    "country": "us",
                    "language": "en",
                    "category": "general",
                    "size": 10
                }
            ),
            "search": EndpointSchema(
                route="/news",
                method="GET", 
                name="Search News",
                description="Search for specific news articles",
                payload={
                    "q": "search query",
                    "country": "us",
                    "language": "en",
                    "size": 10
                }
            ),
            "crypto": EndpointSchema(
                route="/crypto",
                method="GET",
                name="Crypto News",
                description="Get cryptocurrency related news",
                payload={
                    "coin": "bitcoin",
                    "language": "en",
                    "size": 10
                }
            ),
            "sources": EndpointSchema(
                route="/sources",
                method="GET",
                name="News Sources",
                description="Get available news sources",
                payload={
                    "country": "us",
                    "language": "en",
                    "category": "general"
                }
            ),
            "archive": EndpointSchema(
                route="/archive",
                method="GET",
                name="News Archive",
                description="Get historical news articles",
                payload={
                    "q": "search query",
                    "from_date": "2024-01-01",
                    "to_date": "2024-12-31",
                    "language": "en",
                    "size": 10
                }
            )
        }
        
        super().__init__(base_url, endpoints)
