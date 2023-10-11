import { Test } from '@nestjs/testing';
import { RestaurantsService } from './restaurants.service';
import { Restaurant } from './entities/restaurant.entity';
import { ILike, Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Dish } from './entities/dish.entity';
import { Category } from './entities/category.entity';
import { User, UserRole } from 'src/users/entities/user.entity';
import { CategoryRepository } from './repositories/category.repository';

const mockRepository = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findAndCount: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
});

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const Owner: User = {
  id: 1,
  email: 'EMAIL@EMAIL.com',
  password: 'PASSWORD',
  role: UserRole.Owner,
  verified: true,
  restaurants: [],
  payments: [],
  orders: [],
  rides: [],
  hashPassword: jest.fn(),
  checkPassword: jest.fn(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

const createRestaurantArgs = {
  name: 'name',
  coverImg: 'coverImg',
  address: 'address',
  categoryName: 'categoryName',
};

const editRestaurantArgs = {
  restaurantId: 1,
  categoryName: 'categoryName_2',
  name: 'name_2',
};

const category: Category = {
  id: 1,
  name: 'categoryName',
  slug: 'categorySlug',
  restaurants: [],
  coverImg: 'coverImg',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const editDishArgs = {
  dishId: 1,
  options: [],
  name: 'Dish',
  price: 1,
  description: 'Description',
  restaurantId: 1,
};

const createDishArgs = {
  restaurantId: 1,
  options: [],
  name: 'Dish',
  price: 1,
  description: 'Description',
};

describe('RestaurantsService', () => {
  let service: RestaurantsService;
  let restaurantsRepository: MockRepository<Restaurant>;
  let dishesRepository: MockRepository<Dish>;
  let categories: CategoryRepository;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        RestaurantsService,
        {
          provide: getRepositoryToken(Restaurant),
          useValue: mockRepository(),
        },
        {
          provide: getRepositoryToken(Dish),
          useValue: mockRepository(),
        },
        {
          provide: CategoryRepository,
          useValue: {
            getOrCreate: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();
    service = module.get<RestaurantsService>(RestaurantsService);
    restaurantsRepository = module.get(getRepositoryToken(Restaurant));
    dishesRepository = module.get(getRepositoryToken(Dish));
    categories = module.get(CategoryRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createRestaurant', () => {
    it('should fail on exception', async () => {
      restaurantsRepository.findOne.mockRejectedValue(new Error(':)'));

      const result = await service.createRestaurant(null, createRestaurantArgs);

      expect(result).toEqual({
        ok: false,
        error: 'Could not create restaurant',
      });
    });

    it('should create a new restaurant', async () => {
      restaurantsRepository.create.mockReturnValue(createRestaurantArgs);
      restaurantsRepository.save.mockResolvedValue(createRestaurantArgs);
      jest.spyOn(categories, 'getOrCreate').mockImplementation(async () => {
        return category;
      });

      const result = await service.createRestaurant(
        Owner,
        createRestaurantArgs,
      );
      expect(restaurantsRepository.create).toHaveBeenCalledTimes(1);
      expect(restaurantsRepository.create).toHaveBeenCalledWith(
        createRestaurantArgs,
      );

      expect(categories.getOrCreate).toHaveBeenCalledTimes(1);

      expect(restaurantsRepository.save).toHaveBeenCalledTimes(1);
      expect(restaurantsRepository.save).toHaveBeenCalledWith(
        createRestaurantArgs,
      );
      expect(result).toEqual({ ok: true });
    });
  });

  describe('editRestaurant', () => {
    it('should fail if restaurant not found', async () => {
      restaurantsRepository.findOne.mockResolvedValue(undefined);

      const result = await service.editRestaurant(Owner, editRestaurantArgs);

      expect(result).toEqual({
        ok: false,
        error: 'Restaurant not found',
      });
    });

    it('should fail it user is not owner', async () => {
      restaurantsRepository.findOne.mockResolvedValue({
        ownerId: 2,
      });

      const result = await service.editRestaurant(Owner, editRestaurantArgs);

      expect(result).toEqual({
        ok: false,
        error: 'You can not edit a restaurant that you do not own',
      });
    });

    it('should edit restaurant', async () => {
      restaurantsRepository.findOne.mockResolvedValue({
        ownerId: 1,
      });
      restaurantsRepository.save.mockResolvedValue({
        id: 1,
      });

      const result = await service.editRestaurant(Owner, editRestaurantArgs);

      expect(restaurantsRepository.save).toHaveBeenCalledTimes(1);
      expect(restaurantsRepository.save).toHaveBeenCalledWith([
        {
          id: 1,
          ...editRestaurantArgs,
        },
      ]);

      expect(result).toEqual({
        ok: true,
      });
    });

    it('should get or create category', async () => {
      restaurantsRepository.findOne.mockResolvedValue({
        ownerId: 1,
      });
      restaurantsRepository.save.mockResolvedValue({
        id: 1,
      });

      jest.spyOn(categories, 'getOrCreate').mockImplementation(async () => {
        return category;
      });

      const result = await service.editRestaurant(Owner, editRestaurantArgs);

      expect(restaurantsRepository.save).toHaveBeenCalledTimes(1);
      expect(restaurantsRepository.save).toHaveBeenCalledWith([
        {
          id: 1,
          ...editRestaurantArgs,
          category,
        },
      ]);

      expect(categories.getOrCreate).toHaveBeenCalledTimes(1);

      expect(result).toEqual({
        ok: true,
      });
    });

    it('should fail on exception', async () => {
      restaurantsRepository.findOne.mockRejectedValue(new Error(':)'));

      const result = await service.editRestaurant(Owner, editRestaurantArgs);

      expect(result).toEqual({
        ok: false,
        error: 'Could not edit restaurant',
      });
    });
  });

  describe('deleteRestaurant', () => {
    it('should fail if restaurant not found', async () => {
      restaurantsRepository.findOne.mockResolvedValue(undefined);

      const result = await service.deleteRestaurant(Owner, { restaurantId: 1 });

      expect(restaurantsRepository.findOne).toHaveBeenCalledTimes(1);
      expect(restaurantsRepository.delete).toHaveBeenCalledTimes(0);
      expect(result).toEqual({
        ok: false,
        error: 'Restaurant not found',
      });
    });

    it('should fail if user is not owner', async () => {
      restaurantsRepository.findOne.mockResolvedValue({
        ownerId: 2,
      });

      const result = await service.deleteRestaurant(Owner, { restaurantId: 1 });

      expect(restaurantsRepository.findOne).toHaveBeenCalledTimes(1);
      expect(restaurantsRepository.delete).toHaveBeenCalledTimes(0);
      expect(result).toEqual({
        ok: false,
        error: 'You can not delete a restaurant that you do not own',
      });
    });

    it('should delete restaurant', async () => {
      restaurantsRepository.findOne.mockResolvedValue({
        ownerId: 1,
      });

      restaurantsRepository.delete.mockResolvedValue({
        id: 1,
      });

      const result = await service.deleteRestaurant(Owner, { restaurantId: 1 });

      expect(restaurantsRepository.findOne).toHaveBeenCalledTimes(1);
      expect(restaurantsRepository.delete).toHaveBeenCalledTimes(1);
      expect(restaurantsRepository.delete).toHaveBeenCalledWith(1);
      expect(result).toEqual({
        ok: true,
      });
    });

    it('should fail on exception', async () => {
      restaurantsRepository.findOne.mockRejectedValue(new Error(':)'));

      const result = await service.deleteRestaurant(Owner, { restaurantId: 1 });

      expect(result).toEqual({
        ok: false,
        error: 'Could not delete restaurant',
      });
    });
  });

  describe('allCategories', () => {
    it('should get all categories', async () => {
      jest.spyOn(categories, 'find').mockImplementation(async () => {
        return [category];
      });

      const result = await service.allCategories();

      expect(categories.find).toHaveBeenCalledTimes(1);

      expect(result).toEqual({
        ok: true,
        categories: [category],
      });
    });

    it('should fail on exception', async () => {
      jest.spyOn(categories, 'find').mockRejectedValue(new Error(':)'));

      const result = await service.allCategories();

      expect(result).toEqual({
        ok: false,
        error: 'Could not load categories',
      });
    });
  });

  describe('countRestaurants', () => {
    it('should count restaurants', async () => {
      restaurantsRepository.count.mockResolvedValue(1);

      const result = await service.countRestaurants(category);

      expect(restaurantsRepository.count).toHaveBeenCalledTimes(1);
      expect(restaurantsRepository.count).toHaveBeenCalledWith({
        where: {
          category: {
            id: category.id,
          },
        },
      });

      expect(result).toEqual(1);
    });
  });

  describe('findCategoryBySlug', () => {
    it('should fail if category not found', async () => {
      jest.spyOn(categories, 'findOne').mockImplementation(async () => {
        return undefined;
      });

      const result = await service.findCategoryBySlug({
        slug: 'slug',
        page: 1,
      });

      expect(categories.findOne).toHaveBeenCalledTimes(1);
      expect(categories.findOne).toHaveBeenCalledWith({
        where: {
          slug: 'slug',
        },
      });

      expect(result).toEqual({
        ok: false,
        error: 'Category not found',
      });
    });

    it('should find category by slug', async () => {
      jest.spyOn(categories, 'findOne').mockImplementation(async () => {
        return category;
      });
      restaurantsRepository.find.mockResolvedValue([new Restaurant()]);
      service.countRestaurants = jest.fn().mockResolvedValue(1);

      const result = await service.findCategoryBySlug({
        slug: 'slug',
        page: 1,
      });

      expect(categories.findOne).toHaveBeenCalledTimes(1);
      expect(categories.findOne).toHaveBeenCalledWith({
        where: {
          slug: 'slug',
        },
      });

      expect(restaurantsRepository.find).toHaveBeenCalledTimes(1);
      expect(restaurantsRepository.find).toHaveBeenCalledWith({
        where: {
          category: {
            id: category.id,
          },
        },
        take: 25,
        skip: 0,
        order: {
          isPromoted: 'DESC',
        },
      });

      expect(service.countRestaurants).toHaveBeenCalledTimes(1);

      expect(result).toEqual({
        ok: true,
        category,
        totalPages: 1,
        restaurants: [new Restaurant()],
      });
    });

    it('should fail on exception', async () => {
      jest.spyOn(categories, 'findOne').mockRejectedValue(new Error(':)'));

      const result = await service.findCategoryBySlug({
        slug: 'slug',
        page: 1,
      });

      expect(result).toEqual({
        ok: false,
        error: 'Could not load category',
      });
    });
  });

  describe('allRestaurants', () => {
    it('should find restaurants', async () => {
      restaurantsRepository.findAndCount.mockResolvedValue([
        [new Restaurant()],
        1,
      ]);

      const result = await service.allRestaurants({ page: 1 });

      expect(restaurantsRepository.findAndCount).toHaveBeenCalledTimes(1);
      expect(restaurantsRepository.findAndCount).toHaveBeenCalledWith({
        take: 25,
        skip: 0,
        order: {
          isPromoted: 'DESC',
        },
      });
      expect(result).toEqual({
        ok: true,
        results: [new Restaurant()],
        totalPages: 1,
        totalResults: 1,
      });
    });

    it('should fail on exception', async () => {
      restaurantsRepository.findAndCount.mockRejectedValue(new Error(':)'));
      const result = await service.allRestaurants({ page: 1 });

      expect(result).toEqual({
        ok: false,
        error: 'Could not load restaurants',
      });
    });
  });

  describe('findRestaurantById', () => {
    it('should fail if restaurant not found', async () => {
      restaurantsRepository.findOne.mockResolvedValue(undefined);

      const result = await service.findRestaurantById({ restaurantId: 1 });

      expect(restaurantsRepository.findOne).toHaveBeenCalledTimes(1);
      expect(restaurantsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['menu'],
      });

      expect(result).toEqual({
        ok: false,
        error: 'Restaurant not found',
      });
    });

    it('should find restaurant by id', async () => {
      restaurantsRepository.findOne.mockResolvedValue(new Restaurant());

      const result = await service.findRestaurantById({ restaurantId: 1 });

      expect(restaurantsRepository.findOne).toHaveBeenCalledTimes(1);
      expect(restaurantsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['menu'],
      });

      expect(result).toEqual({
        ok: true,
        restaurant: new Restaurant(),
      });
    });

    it('should fail on exception', async () => {
      restaurantsRepository.findOne.mockRejectedValue(new Error(':)'));

      const result = await service.findRestaurantById({ restaurantId: 1 });

      expect(result).toEqual({
        ok: false,
        error: 'Could not find restaurant',
      });
    });
  });

  describe('searchRestaurantByName', () => {
    it('should find restaurant by name', async () => {
      restaurantsRepository.findAndCount.mockResolvedValue([
        [new Restaurant()],
        1,
      ]);

      const query = 'query';

      const result = await service.searchRestaurantByName({ query, page: 1 });

      expect(restaurantsRepository.findAndCount).toHaveBeenCalledTimes(1);
      expect(restaurantsRepository.findAndCount).toHaveBeenCalledWith({
        where: {
          name: ILike(`%${query}%`),
        },
        take: 25,
        skip: 0,
      });

      expect(result).toEqual({
        ok: true,
        restaurants: [new Restaurant()],
        totalResults: 1,
        totalPages: 1,
      });
    });

    it('should fail on exception', async () => {
      restaurantsRepository.findAndCount.mockRejectedValue(new Error(':)'));

      const result = await service.searchRestaurantByName({
        query: '',
        page: 1,
      });

      expect(result).toEqual({
        ok: false,
        error: 'Could not search for restaurants',
      });
    });
  });

  describe('createDish', () => {
    it('should fail if restaurant not found', async () => {
      restaurantsRepository.findOne.mockResolvedValue(undefined);

      const result = await service.createDish(Owner, createDishArgs);

      expect(result).toEqual({
        ok: false,
        error: 'Restaurant not found',
      });
    });

    it('should fail if user is not owner', async () => {
      restaurantsRepository.findOne.mockResolvedValue({
        ownerId: 2,
      });

      const result = await service.createDish(Owner, createDishArgs);

      expect(result).toEqual({
        ok: false,
        error: 'You can not create a dish for a restaurant that you do not own',
      });
    });

    it('should create dish', async () => {
      restaurantsRepository.findOne.mockResolvedValue({
        ownerId: 1,
      });
      dishesRepository.create.mockReturnValue({
        id: 1,
      });

      dishesRepository.save.mockResolvedValue({
        id: 1,
      });

      const result = await service.createDish(Owner, createDishArgs);

      expect(dishesRepository.create).toHaveBeenCalledTimes(1);
      expect(dishesRepository.create).toHaveBeenCalledWith({
        restaurant: {
          ownerId: 1,
        },
        options: [],
        name: 'Dish',
        price: 1,
        description: 'Description',
        restaurantId: 1,
      });
      expect(dishesRepository.save).toHaveBeenCalledTimes(1);
      expect(dishesRepository.save).toHaveBeenCalledWith({
        id: 1,
      });
      expect(result).toEqual({
        ok: true,
      });
    });

    it('should fail on exception', async () => {
      restaurantsRepository.findOne.mockRejectedValue(new Error(':)'));

      const result = await service.createDish(Owner, createDishArgs);

      expect(result).toEqual({
        ok: false,
        error: 'Could not create dish',
      });
    });
  });

  describe('editDish', () => {
    it('should fail if dish not found', async () => {
      dishesRepository.findOne.mockResolvedValue(undefined);

      const result = await service.editDish(Owner, editDishArgs);

      expect(result).toEqual({
        ok: false,
        error: 'Dish not found',
      });
    });

    it('should fail if user is not owner', async () => {
      dishesRepository.findOne.mockResolvedValue({
        restaurant: {
          ownerId: 2,
        },
      });

      const result = await service.editDish(Owner, editDishArgs);

      expect(result).toEqual({
        ok: false,
        error: 'You can not edit a dish that you do not own',
      });
    });

    it('should edit dish', async () => {
      dishesRepository.findOne.mockResolvedValue({
        restaurant: {
          ownerId: 1,
        },
      });
      dishesRepository.save.mockResolvedValue({
        id: 1,
      });

      const result = await service.editDish(Owner, editDishArgs);

      expect(dishesRepository.findOne).toHaveBeenCalledTimes(1);
      expect(dishesRepository.save).toHaveBeenCalledTimes(1);
      expect(dishesRepository.save).toHaveBeenCalledWith([
        {
          id: 1,
          ...editDishArgs,
        },
      ]);
      expect(result).toEqual({
        ok: true,
      });
    });

    it('should fail on exception', async () => {
      dishesRepository.findOne.mockRejectedValue(new Error(':)'));

      const result = await service.editDish(Owner, editDishArgs);

      expect(result).toEqual({
        ok: false,
        error: 'Could not edit dish',
      });
    });
  });

  describe('deleteDish', () => {
    it('should fail if dish not found', async () => {
      dishesRepository.findOne.mockResolvedValue(undefined);

      const result = await service.deleteDish(Owner, { dishId: 1 });

      expect(result).toEqual({
        ok: false,
        error: 'Dish not found',
      });
    });

    it('should fail if user is not owner', async () => {
      dishesRepository.findOne.mockResolvedValue({
        restaurant: {
          ownerId: 2,
        },
      });

      const result = await service.deleteDish(Owner, { dishId: 1 });

      expect(result).toEqual({
        ok: false,
        error: 'You can not delete a dish that you do not own',
      });
    });

    it('should delete dish', async () => {
      dishesRepository.findOne.mockResolvedValue({
        restaurant: {
          ownerId: 1,
        },
      });
      dishesRepository.delete.mockResolvedValue({
        id: 1,
      });

      const result = await service.deleteDish(Owner, { dishId: 1 });

      expect(dishesRepository.findOne).toHaveBeenCalledTimes(1);
      expect(dishesRepository.delete).toHaveBeenCalledTimes(1);
      expect(dishesRepository.delete).toHaveBeenCalledWith(1);
      expect(result).toEqual({
        ok: true,
      });
    });

    it('should fail on exception', async () => {
      dishesRepository.findOne.mockRejectedValue(new Error(':)'));

      const result = await service.deleteDish(Owner, { dishId: 1 });

      expect(result).toEqual({
        ok: false,
        error: 'Could not delete dish',
      });
    });
  });
});
