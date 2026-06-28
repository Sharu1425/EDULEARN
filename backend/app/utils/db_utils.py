from bson import ObjectId
from typing import Union

def parse_object_id(id_str: str) -> Union[ObjectId, str]:
    """
    Tries to parse a string into an ObjectId.
    If the string is not a valid 24-character hex string, it returns the string itself.
    """
    if ObjectId.is_valid(id_str):
        return ObjectId(id_str)
    return id_str
