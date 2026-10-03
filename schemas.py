from pydantic import BaseModel

class LoginRequest(BaseModel):
    username: str
    password: str

#Input Schema
class BlogCreate(BaseModel):
    title: str
    content:str

#Output Schema
class BlogResponse(BaseModel):
    id:int
    title:str
    content:str

    class Config:
        from_attributes = True