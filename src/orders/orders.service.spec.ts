import { Repository } from 'typeorm';
import { OrderService } from './orders.service';
import { Order, OrderStatus } from './entities/order.entity';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';
import { OrderItem } from './entities/order-item.entity';
import { Dish } from 'src/restaurants/entities/dish.entity';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User, UserRole } from 'src/users/entities/user.entity';
import { CreateOrderInput } from './dtos/create-order.dto';
import { PUB_SUB } from 'src/common/common.constant';
import { GetOrdersInput } from './dtos/get-orders.dto';

const Customer = new User();
Customer.id = 1;
Customer.role = UserRole.Client;

const Owner = new User();
Owner.id = 2;
Owner.role = UserRole.Owner;

const Delivery = new User();
Delivery.id = 3;
Delivery.role = UserRole.Delivery;

const dish = new Dish();
dish.id = 1;
dish.name = 'dish-name';
dish.price = 10;
dish.options = [
  {
    name: 'option-name',
    extra: 1,
    choices: [
      {
        name: 'choice-name',
        extra: 1,
      },
    ],
  },
  {
    name: 'option-name_2',
    choices: [
      {
        name: 'choice-name_2-1',
        extra: 1,
      },
      {
        name: 'choice-name_2-2',
        extra: 2,
      },
    ],
  },
];

const createOrderArgs = new CreateOrderInput();
createOrderArgs.restaurantId = 1;
createOrderArgs.items = [
  {
    dishId: 1,
    options: [
      {
        name: 'option-name',
        choice: 'choice-name',
      },
      {
        name: 'option-name_2',
        choice: 'choice-name_2-2',
      },
    ],
  },
];

const getOrdersArgs = new GetOrdersInput();
getOrdersArgs.status = OrderStatus.Pending;
getOrdersArgs.page = 1;

const editOrderArgs = {
  id: 1,
  status: OrderStatus.Cooking,
};

const mockRepository = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  findOneOrFail: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
});

const mockPubSub = {
  publish: jest.fn(),
  subscribe: jest.fn(),
  asyncIterator: jest.fn(),
};

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

jest.mock('graphql-subscriptions', () => ({
  PubSub: jest.fn(() => mockPubSub),
}));

describe('OrdersService', () => {
  let service: OrderService;
  let ordersRepository: MockRepository<Order>;
  let restaurantsRepository: MockRepository<Restaurant>;
  let orderItemsRepository: MockRepository<OrderItem>;
  let dishesRepository: MockRepository<Dish>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: getRepositoryToken(Order),
          useValue: mockRepository(),
        },
        {
          provide: getRepositoryToken(Restaurant),
          useValue: mockRepository(),
        },
        {
          provide: getRepositoryToken(OrderItem),
          useValue: mockRepository(),
        },
        {
          provide: getRepositoryToken(Dish),
          useValue: mockRepository(),
        },
        {
          provide: PUB_SUB,
          useValue: mockPubSub,
        },
      ],
    }).compile();
    service = module.get<OrderService>(OrderService);
    ordersRepository = module.get(getRepositoryToken(Order));
    restaurantsRepository = module.get(getRepositoryToken(Restaurant));
    orderItemsRepository = module.get(getRepositoryToken(OrderItem));
    dishesRepository = module.get(getRepositoryToken(Dish));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createOrder', () => {
    it('should fail if restaurant does not exist', async () => {
      restaurantsRepository.findOne.mockResolvedValue(undefined);
      const result = await service.createOrder(Customer, createOrderArgs);
      expect(result).toEqual({ ok: false, error: 'Restaurant not found.' });
    });

    it('should fail if dish does not exist', async () => {
      restaurantsRepository.findOne.mockResolvedValue(new Restaurant());
      dishesRepository.findOne.mockResolvedValue(undefined);
      const result = await service.createOrder(Customer, createOrderArgs);
      expect(result).toEqual({ ok: false, error: 'Dish not found.' });
    });

    it('should fail if dish option does not exist', async () => {
      restaurantsRepository.findOne.mockResolvedValue(new Restaurant());
      dishesRepository.findOne.mockResolvedValue({
        options: [{ name: 'name_2', extra: 1 }],
      });
      const result = await service.createOrder(Customer, createOrderArgs);
      expect(result).toEqual({
        ok: false,
        error: 'Dish option option-name not found.',
      });
    });

    it('should fail if dish option choice does not exist', async () => {
      restaurantsRepository.findOne.mockResolvedValue(new Restaurant());
      dishesRepository.findOne.mockResolvedValue({
        options: [
          {
            name: 'option-name',
            choices: [{ name: 'idot-choice', extra: 1 }],
          },
        ],
      });
      const result = await service.createOrder(Customer, createOrderArgs);
      expect(result).toEqual({
        ok: false,
        error: 'Dish option choice choice-name not found.',
      });
    });

    it('should create a new order', async () => {
      restaurantsRepository.findOne.mockResolvedValue(new Restaurant());
      dishesRepository.findOne.mockResolvedValue(dish);
      orderItemsRepository.create.mockReturnValue({
        id: 1,
      });
      orderItemsRepository.save.mockResolvedValue({
        id: 1,
      });
      ordersRepository.create.mockReturnValue({
        id: 1,
      });
      ordersRepository.save.mockResolvedValue({
        id: 1,
      });

      const result = await service.createOrder(Customer, createOrderArgs);
      expect(result).toEqual({ ok: true });
      expect(ordersRepository.create).toHaveBeenCalledTimes(1);
      expect(ordersRepository.create).toHaveBeenCalledWith({
        customer: Customer,
        restaurant: new Restaurant(),
        items: [
          {
            id: 1,
          },
        ],
        total: 13,
      });
      expect(ordersRepository.save).toHaveBeenCalledTimes(1);
      expect(ordersRepository.save).toHaveBeenCalledWith({
        id: 1,
      });
      expect(orderItemsRepository.create).toHaveBeenCalledTimes(1);
      expect(orderItemsRepository.create).toHaveBeenCalledWith({
        dish: dish,
        options: [
          {
            name: 'option-name',
            choice: 'choice-name',
          },
          {
            name: 'option-name_2',
            choice: 'choice-name_2-2',
          },
        ],
      });
    });

    it('should fail on exception', async () => {
      restaurantsRepository.findOne.mockRejectedValue(new Error(':)'));

      const result = await service.createOrder(Customer, createOrderArgs);
      expect(result).toEqual({ ok: false, error: 'Could not create order' });
    });
  });

  describe('getOrders', () => {
    it('should get orders when user is Client', async () => {
      ordersRepository.find.mockResolvedValue([
        {
          id: 1,
        },
      ]);
      const result = await service.getOrders(Customer, getOrdersArgs);
      expect(result).toEqual({ ok: true, orders: [{ id: 1 }] });
      expect(ordersRepository.find).toHaveBeenCalledTimes(1);
      expect(ordersRepository.find).toHaveBeenCalledWith({
        where: {
          customer: {
            id: Customer.id,
          },
          status: getOrdersArgs.status,
        },
        take: 25,
        skip: 0,
      });
    });

    it('should get orders when user is Owner', async () => {
      restaurantsRepository.find.mockResolvedValue([
        {
          id: 1,
          orders: [
            {
              id: 1,
              status: getOrdersArgs.status,
            },
          ],
        },
      ]);

      const result = await service.getOrders(Owner, getOrdersArgs);
      expect(result).toEqual({
        ok: true,
        orders: [{ id: 1, status: getOrdersArgs.status }],
      });
      expect(restaurantsRepository.find).toHaveBeenCalledTimes(1);
      expect(restaurantsRepository.find).toHaveBeenCalledWith({
        where: {
          owner: {
            id: Owner.id,
          },
        },
        relations: ['orders'],
      });
    });

    it('should get orders when user is Delivery', async () => {
      ordersRepository.find.mockResolvedValue([
        {
          id: 1,
        },
      ]);
      const result = await service.getOrders(Delivery, getOrdersArgs);
      expect(result).toEqual({ ok: true, orders: [{ id: 1 }] });
      expect(ordersRepository.find).toHaveBeenCalledTimes(1);
      expect(ordersRepository.find).toHaveBeenCalledWith({
        where: {
          driver: {
            id: Delivery.id,
          },
          status: getOrdersArgs.status,
        },
        take: 25,
        skip: 0,
      });
    });

    it('should fail on exception', async () => {
      ordersRepository.find.mockRejectedValue(new Error(':)'));

      const result = await service.getOrders(Owner, getOrdersArgs);
      expect(result).toEqual({ ok: false, error: 'Could not get orders' });
    });
  });

  describe('getOrder', () => {
    it('should fail if order does not exist', async () => {
      ordersRepository.findOne.mockResolvedValue(undefined);

      const result = await service.getOrder(Owner, { id: 1 });
      expect(result).toEqual({ ok: false, error: 'Order not found' });
    });

    it('should fail if customer cannot see the order', async () => {
      ordersRepository.findOne.mockResolvedValue({
        id: 1,
        customerId: 999,
      });

      const result = await service.getOrder(Customer, { id: 1 });
      expect(result).toEqual({
        ok: false,
        error: "You can't see other peoples' orders",
      });
    });

    it('should fail if driver cannot see the order', async () => {
      ordersRepository.findOne.mockResolvedValue({
        id: 1,
        driverId: 999,
      });

      const result = await service.getOrder(Delivery, { id: 1 });
      expect(result).toEqual({
        ok: false,
        error: "You can't see other peoples' orders",
      });
    });

    it('should fail if owner cannot see the order', async () => {
      ordersRepository.findOne.mockResolvedValue({
        id: 1,
        restaurant: {
          ownerId: 999,
        },
      });

      const result = await service.getOrder(Owner, { id: 1 });
      expect(result).toEqual({
        ok: false,
        error: "You can't see other peoples' orders",
      });
    });

    it('should return order', async () => {
      ordersRepository.findOne.mockResolvedValue({
        id: 1,
        restaurant: {
          ownerId: Owner.id,
        },
      });

      const result = await service.getOrder(Owner, { id: 1 });
      expect(result).toEqual({
        ok: true,
        order: {
          id: 1,
          restaurant: {
            ownerId: Owner.id,
          },
        },
      });
    });

    it('should fail on exception', async () => {
      ordersRepository.findOne.mockRejectedValue(new Error(':)'));

      const result = await service.getOrder(Owner, { id: 1 });
      expect(result).toEqual({ ok: false, error: 'Could not load order' });
    });
  });

  describe('editOrder', () => {
    it('should fail if order does not exist', async () => {
      ordersRepository.findOne.mockResolvedValue(undefined);

      const result = await service.editOrder(Owner, editOrderArgs);
      expect(result).toEqual({ ok: false, error: 'Order not found' });
    });

    it('should fail if user cannot see the order', async () => {
      ordersRepository.findOne.mockResolvedValue({
        id: 1,
        customerId: 999,
      });

      const result = await service.editOrder(Customer, editOrderArgs);
      expect(result).toEqual({
        ok: false,
        error: "You can't see other peoples' orders",
      });
    });

    it('should fail if user is customer', async () => {
      ordersRepository.findOne.mockResolvedValue({
        id: 1,
        customerId: Customer.id,
      });

      const result = await service.editOrder(Customer, editOrderArgs);
      expect(result).toEqual({
        ok: false,
        error: "Client can't edit order status to Cooking",
      });
    });

    it('should fail if user is delivery and status is not PickedUp or Delivered', async () => {
      ordersRepository.findOne.mockResolvedValue({
        id: 1,
        driverId: Delivery.id,
      });

      const result = await service.editOrder(Delivery, editOrderArgs);
      expect(result).toEqual({
        ok: false,
        error: "Delivery can't edit order status to Cooking",
      });
    });

    it('should fail if user is owner and status is not Cooking or Cooked', async () => {
      ordersRepository.findOne.mockResolvedValue({
        id: 1,
        restaurant: {
          ownerId: Owner.id,
        },
      });

      const result = await service.editOrder(Owner, {
        id: 1,
        status: OrderStatus.Pending,
      });
      expect(result).toEqual({
        ok: false,
        error: "Owner can't edit order status to Pending",
      });
    });

    it('should edit order', async () => {
      ordersRepository.findOne.mockResolvedValue({
        id: 1,
        restaurant: {
          ownerId: Owner.id,
        },
      });

      const result = await service.editOrder(Owner, {
        id: 1,
        status: OrderStatus.Cooked,
      });
      expect(result).toEqual({ ok: true });
      expect(ordersRepository.save).toHaveBeenCalledTimes(1);
      expect(ordersRepository.save).toHaveBeenCalledWith({
        id: 1,
        status: OrderStatus.Cooked,
      });
    });

    it('should fail on exception', async () => {
      ordersRepository.findOne.mockRejectedValue(new Error(':)'));

      const result = await service.editOrder(Owner, editOrderArgs);
      expect(result).toEqual({ ok: false, error: 'Could not edit order' });
    });
  });

  describe('takeOrder', () => {
    it('should fail if order does not exist', async () => {
      ordersRepository.findOne.mockResolvedValue(undefined);

      const result = await service.takeOrder(Delivery, { id: 1 });
      expect(result).toEqual({ ok: false, error: 'Order not found' });
    });

    it('should fail if driver is not owner of the order', async () => {
      ordersRepository.findOne.mockResolvedValue({
        id: 1,
        driver: { id: 999 },
      });

      const result = await service.takeOrder(Delivery, { id: 1 });
      expect(result).toEqual({
        ok: false,
        error: 'This order already has a driver',
      });
    });

    it('should take order', async () => {
      ordersRepository.findOne.mockResolvedValue({
        id: 1,
      });
      ordersRepository.save.mockResolvedValue({
        id: 1,
      });

      const result = await service.takeOrder(Delivery, { id: 1 });
      expect(result).toEqual({ ok: true });
      expect(ordersRepository.save).toHaveBeenCalledTimes(1);
      expect(ordersRepository.save).toHaveBeenCalledWith({
        id: 1,
        driver: Delivery,
      });
    });

    it('should fail on exception', async () => {
      ordersRepository.findOne.mockRejectedValue(new Error(':)'));

      const result = await service.takeOrder(Delivery, { id: 1 });
      expect(result).toEqual({ ok: false, error: 'Could not update order' });
    });
  });
});
