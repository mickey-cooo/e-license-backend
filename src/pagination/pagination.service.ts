import { Injectable } from '@nestjs/common';
import { PaginationRequestDTO } from './dto/pagination.request.dto';
import {
  PaginationMeta,
  PaginationResult,
} from './inteface/pagination.interface';

@Injectable()
export class PaginationService {
  private readonly DEFAULT_LIMIT = 1;
  private readonly MAX_LIMIT = 100;

  async paginate<T>(data: any, options: PaginationRequestDTO) {
    const pagination = this.calculatePagination(options);
    const [items, totalItems] = await data
      .skip(pagination.skip)
      .take(pagination.take)
      .getManyAndCount();

    return this.createPaginationResponse<T>(items, totalItems, pagination);
  }

  paginateArray<T>(
    array: T[],
    options: PaginationRequestDTO,
  ): PaginationResult<T> {
    const meta = this.calculatePagination(options);
    const totalItems = array.length;
    const data = array.slice(meta.skip, meta.skip + meta.take);

    return this.createPaginationResponse(data, totalItems, meta);
  }

  private calculatePagination(options: PaginationRequestDTO): PaginationMeta {
    const page = Math.max(1, options.page || this.DEFAULT_LIMIT);
    let limit = options.limit || this.DEFAULT_LIMIT;

    const skip =
      options.offset !== undefined ? options.offset : (page - 1) * limit;

    limit = Math.min(limit, this.MAX_LIMIT);
    return {
      skip,
      take: limit,
      currentPage: page,
    };
  }

  private createPaginationResponse<T>(
    data: T[],
    totalItems: number,
    pagination: PaginationMeta,
  ): PaginationResult<T> {
    const totalPages = Math.ceil(totalItems / pagination.take) || 1;
    const currentPage = pagination.currentPage;

    return {
      data,
      pagination: {
        currentPage,
        totalPages,
        totalItems,
        itemPerPage: pagination.take,
        hasNextPage: currentPage < totalPages,
        hasPreviousPage: currentPage > 1,
      },
    };
  }
}
