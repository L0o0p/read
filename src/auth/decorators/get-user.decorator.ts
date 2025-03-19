import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetUser = createParamDecorator(
    (data: string | undefined, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        const user = request.user;

        // 如果指定了数据属性，返回该属性
        if (data) {
            return user?.[data];
        }

        // 否则返回整个用户对象
        return user;
    },
);