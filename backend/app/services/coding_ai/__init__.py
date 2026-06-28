from .base_service import GeminiCodingBase
from .mcq_service import MCQServiceMixin
from .coding_service import CodingServiceMixin
from .reports_service import ReportsServiceMixin

class GeminiCodingService(GeminiCodingBase, MCQServiceMixin, CodingServiceMixin, ReportsServiceMixin):
    pass
