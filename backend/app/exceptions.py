class AppError(Exception):
    pass


class NotFoundError(AppError):
    def __init__(self, resource: str):
        super().__init__(f"{resource} not found")


class ForbiddenError(AppError):
    def __init__(self, detail: str = "Forbidden"):
        super().__init__(detail)


class ConflictError(AppError):
    def __init__(self, detail: str):
        super().__init__(detail)


class DomainValidationError(AppError):
    def __init__(self, detail: str):
        super().__init__(detail)


class UnauthorizedError(AppError):
    def __init__(self, detail: str = "Unauthorized"):
        super().__init__(detail)
