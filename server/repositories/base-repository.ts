/**
 * Interface base para todos os repositórios
 */
export interface BaseRepository<T, CreateDTO, UpdateDTO = Partial<CreateDTO>> {
  /**
   * Encontra uma entidade pelo ID
   */
  findById(id: number): Promise<T | undefined>

  /**
   * Cria uma nova entidade
   */
  create(data: CreateDTO): Promise<T>

  /**
   * Atualiza uma entidade existente
   */
  update(id: number, data: UpdateDTO): Promise<T | undefined>

  /**
   * Exclui uma entidade
   */
  delete(id: number): Promise<boolean>

  /**
   * Lista todas as entidades
   */
  findAll(): Promise<T[]>
}
